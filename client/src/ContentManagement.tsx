import { useEffect, useState } from 'react';
import { currentSchoolSettings, managedMedia, managedNotices, managedPages, publicMedia, saveManagedMedia, saveManagedPage, saveNotice, saveSchoolSettings, themePresets, uploadImageToCloudinary, type ManagedMedia, type ManagedPage, type NoticeRecord, type SchoolSettings, type SessionUser } from './api';
import './content-management.css';

const anthemSections = [
  ['national-anthem', 'National Anthem'],
  ['national-pledge', 'National Pledge'],
  ['school-anthem', 'School Anthem'],
  ['papal-anthem', 'Papal Anthem'],
  ['edo-anthem', 'Edo State Anthem']
];

type EditorSection = ManagedPage['sections'][number];
type SectionImageDraft = { source: 'library' | 'url' | 'upload'; url: string; file?: File };
type NoticeDraft = {
  title: string;
  body: string;
  category: string;
  audience: NoticeRecord['audience'];
  publishAt: string;
  expiresAt: string;
  status: NoticeRecord['status'];
};

function blankPage(): Omit<ManagedPage, '_id'> {
  return { slug: '', title: '', status: 'draft', sections: [] };
}

function blankNotice(): NoticeDraft {
  return {
    title: '',
    body: '',
    category: 'General',
    audience: 'public',
    publishAt: new Date().toISOString().slice(0, 16),
    expiresAt: '',
    status: 'draft'
  };
}

export function ContentManagement({ user, settings, onSettingsChange }: { user: SessionUser; settings: SchoolSettings; onSettingsChange: (settings: SchoolSettings) => void }) {
  const permissions = new Set(user.roles?.flatMap((role) => role.permissions) ?? []);
  const canManageContent = permissions.has('content:manage');
  const canManageMedia = permissions.has('media:manage');
  const [tab, setTab] = useState<'pages' | 'notices' | 'media'>(canManageContent ? 'pages' : 'media');
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [mediaAssets, setMediaAssets] = useState<ManagedMedia[]>([]);
  const [sectionMedia, setSectionMedia] = useState<Array<{ key: string; url: string; altText: string }>>([]);
  const [sectionImageDrafts, setSectionImageDrafts] = useState<Record<string, SectionImageDraft>>({});
  const [page, setPage] = useState<Omit<ManagedPage, '_id'>>(blankPage());
  const [media, setMedia] = useState({ key: '', url: '', altText: '', section: '' });
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [branding, setBranding] = useState<Pick<SchoolSettings, 'themePreset' | 'schoolName' | 'tagline'>>({
    themePreset: 'wine-and-beige',
    schoolName: 'SAPIENZA',
    tagline: 'Catholic School'
  });
  const [noticeDraft, setNoticeDraft] = useState<NoticeDraft>(blankNotice());
  const [brandingMessage, setBrandingMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      ...(canManageContent ? [managedPages(), managedNotices()] : []),
      ...(canManageMedia ? [managedMedia()] : [])
    ]);
    let resultIndex = 0;
    if (canManageContent) {
      const pagesResult = results[resultIndex++];
      if (pagesResult.status === 'fulfilled') {
        if ('pages' in pagesResult.value) setPages(pagesResult.value.pages);
      } else setError(pagesResult.reason instanceof Error ? pagesResult.reason.message : 'Unable to load pages');
      const noticesResult = results[resultIndex++];
      if (noticesResult.status === 'fulfilled') {
        if ('notices' in noticesResult.value) setNotices(noticesResult.value.notices);
      } else setError(noticesResult.reason instanceof Error ? noticesResult.reason.message : 'Unable to load notices');
    }
    if (canManageMedia) {
      const result = results[resultIndex];
      if (result.status === 'fulfilled') {
        if ('media' in result.value) setMediaAssets(result.value.media.filter((asset) => asset.isActive));
      } else setError(result.reason instanceof Error ? result.reason.message : 'Unable to load media');
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    if (canManageContent) {
      void currentSchoolSettings().then(({ settings }) => setBranding({
        themePreset: settings.themePreset,
        schoolName: settings.schoolName,
        tagline: settings.tagline
      })).catch(() => undefined);
      void publicMedia().then((result) => setSectionMedia(result.media)).catch(() => undefined);
    }
  }, [canManageContent]);

  async function submitBranding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBrandingSaving(true);
    setBrandingMessage('');
    try {
      const payload = {
        ...branding,
        palette: themePresets[branding.themePreset].palette
      };
      const result = await saveSchoolSettings(payload);
      onSettingsChange(result.settings);
      setBranding({
        themePreset: result.settings.themePreset,
        schoolName: result.settings.schoolName,
        tagline: result.settings.tagline
      });
      setBrandingMessage('Branding saved. The public site theme has been updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save school branding');
    } finally {
      setBrandingSaving(false);
    }
  }

  function previewTheme(themePreset: SchoolSettings['themePreset']) {
    const nextBranding = { ...branding, themePreset };
    setBranding(nextBranding);
    onSettingsChange({ ...settings, ...nextBranding, palette: themePresets[themePreset].palette });
    setBrandingMessage('');
  }

  async function submitNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        ...noticeDraft,
        publishAt: new Date(noticeDraft.publishAt).toISOString(),
        expiresAt: noticeDraft.expiresAt ? new Date(noticeDraft.expiresAt).toISOString() : undefined
      };
      const result = await saveNotice(payload);
      setNotices((current) => [result.notice, ...current.filter((notice) => notice._id !== result.notice._id)].sort((left, right) => new Date(right.publishAt).getTime() - new Date(left.publishAt).getTime()));
      setNoticeDraft(blankNotice());
      setMessage('Notice saved. It is now available through the public notice board when published.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save notice');
    } finally {
      setSaving(false);
    }
  }

  function selectPage(selected: ManagedPage) {
    setPage({ slug: selected.slug, title: selected.title, status: selected.status, sections: selected.sections.map((section) => ({ ...section })) });
    setSectionImageDrafts({});
    setMessage('');
  }

  function startAnthemPage() {
    setPage({
      slug: 'school-anthems',
      title: 'Anthems and Pledge',
      status: 'draft',
      sections: anthemSections.map(([key, heading], order) => ({ key, heading, body: '', order }))
    });
    setSectionImageDrafts({});
    setTab('pages');
    setMessage('');
  }

  function startPtaPage() {
    setPage({
      slug: 'pta-felicitation',
      title: 'PTA Felicitation',
      status: 'draft',
      sections: [{ key: 'pta-felicitation', heading: 'PTA Felicitation', body: '', mediaKey: 'pta.felicitation', order: 0 }]
    });
    setSectionImageDrafts({});
    setTab('pages');
    setMessage('');
  }

  function updateSection(index: number, changes: Partial<EditorSection>) {
    const oldKey = page.sections[index]?.key;
    setPage((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...changes } : section)
    }));
    if (changes.key && oldKey && oldKey !== changes.key) {
      setSectionImageDrafts((current) => {
        if (!current[oldKey]) return current;
        const next = { ...current, [changes.key!]: current[oldKey] };
        delete next[oldKey];
        return next;
      });
    }
  }

  function updateSectionImage(sectionKey: string, changes: Partial<SectionImageDraft>) {
    setSectionImageDrafts((current) => {
      const existing = current[sectionKey] ?? { source: 'library' as const, url: '' };
      return { ...current, [sectionKey]: { ...existing, ...changes } };
    });
  }

  async function submitPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const slug = page.slug.trim().toLowerCase();
      const sections = await Promise.all(page.sections.map(async (section, order) => {
        const draft = sectionImageDrafts[section.key];
        if (!draft || draft.source === 'library') return { ...section, order };
        if (!canManageMedia) throw new Error('You need image-management permission to add a new section image');
        const key = `${slug}.${section.key}`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '');
        let image: { url: string; publicId?: string; storageProvider: string };
        if (draft.source === 'url') {
          let parsedUrl: URL;
          try { parsedUrl = new URL(draft.url.trim()); } catch { throw new Error(`Enter a valid image URL for section "${section.heading || section.key}"`); }
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Image URLs must use HTTP or HTTPS');
          image = { url: parsedUrl.href, storageProvider: 'external-url' };
        } else {
          if (!draft.file) throw new Error(`Choose an image file for section "${section.heading || section.key}"`);
          if (!draft.file.type.startsWith('image/')) throw new Error('Choose a valid image file');
          if (draft.file.size > 10 * 1024 * 1024) throw new Error('Image must be 10 MB or smaller');
          image = { ...await uploadImageToCloudinary(draft.file), storageProvider: 'cloudinary' };
        }
        await saveManagedMedia({ key, ...image, altText: section.heading?.trim() || page.title.trim() || 'School image', section: section.heading });
        return { ...section, mediaKey: key, order };
      }));
      const result = await saveManagedPage({ ...page, slug, sections });
      setPages((current) => [...current.filter((item) => item.slug !== result.page.slug), result.page].sort((left, right) => left.title.localeCompare(right.title)));
      setPage({ slug: result.page.slug, title: result.page.title, status: result.page.status, sections: result.page.sections });
      setSectionImageDrafts({});
      const refreshedMedia = await publicMedia();
      setSectionMedia(refreshedMedia.media);
      setMessage('Page saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save page');
    } finally {
      setSaving(false);
    }
  }

  async function submitMedia(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      let image = { url: media.url.trim(), publicId: undefined as string | undefined, storageProvider: 'external-url' };
      if (mediaSource === 'upload') {
        if (!imageFile) throw new Error('Choose an image file to upload');
        if (!imageFile.type.startsWith('image/')) throw new Error('Choose a valid image file');
        if (imageFile.size > 10 * 1024 * 1024) throw new Error('Image must be 10 MB or smaller');
        const uploaded = await uploadImageToCloudinary(imageFile);
        image = { ...uploaded, storageProvider: 'cloudinary' };
      }
      const generatedKey = (media.section.trim() || media.altText.trim() || 'school-image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await saveManagedMedia({ ...media, ...image, key: media.key.trim() || generatedKey });
      const result = await managedMedia();
      setMediaAssets(result.media.filter((asset) => asset.isActive));
      const publicResult = await publicMedia();
      setSectionMedia(publicResult.media);
      setImageFile(null);
      setMessage('Image reference saved as a new version.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save image reference');
    } finally {
      setSaving(false);
    }
  }

  return <section className="content-manager">
    <div className="content-manager-heading">
      <div><small>SCHOOL WEBSITE</small><h2>Content &amp; media</h2><p>Update public information and image references without changing application code.</p></div>
      <div className="content-manager-tabs" role="tablist" aria-label="Content management area">
        {canManageContent && <button type="button" role="tab" aria-selected={tab === 'pages'} onClick={() => setTab('pages')}>Pages</button>}
        {canManageContent && <button type="button" role="tab" aria-selected={tab === 'notices'} onClick={() => setTab('notices')}>Notices</button>}
        {canManageMedia && <button type="button" role="tab" aria-selected={tab === 'media'} onClick={() => setTab('media')}>Images</button>}
      </div>
    </div>

    {error && <p className="content-manager-message error" role="alert">{error}</p>}
    {message && <p className="content-manager-message success" role="status">{message}</p>}
    {canManageContent && <form className="branding-editor" onSubmit={submitBranding}>
      <div className="branding-header"><div><small>BRANDING</small><h3>School theme</h3></div><button className="save-content" type="submit" disabled={brandingSaving}>{brandingSaving ? 'Saving...' : 'Save theme'}</button></div>
      <div className="editor-fields">
        <label>School name<input value={branding.schoolName} onChange={(event) => setBranding((current) => ({ ...current, schoolName: event.target.value }))} required /></label>
        <label>Tagline<input value={branding.tagline} onChange={(event) => setBranding((current) => ({ ...current, tagline: event.target.value }))} required /></label>
      </div>
      <div className="theme-preset-list" role="group" aria-label="Theme presets">
        {Object.entries(themePresets).map(([key, preset]) => <button key={key} type="button" aria-pressed={branding.themePreset === key} className={`theme-preset${branding.themePreset === key ? ' active' : ''}`} onClick={() => previewTheme(key as SchoolSettings['themePreset'])}>
          <span className="theme-preset-swatch" style={{ background: `linear-gradient(90deg, ${preset.palette.primary} 0 35%, ${preset.palette.accent} 35% 60%, ${preset.palette.secondary} 60% 100%)` }} aria-hidden="true" />
          <span><strong>{preset.name}</strong><small>{preset.palette.primary}</small></span>
        </button>)}
      </div>
      {brandingMessage && <p className="content-manager-message success" role="status">{brandingMessage}</p>}
    </form>}
    {loading ? <p className="muted">Loading editable content...</p> : tab === 'pages' && canManageContent ? <div className="content-manager-layout">
      <aside className="managed-list" aria-label="Saved pages">
        <div className="managed-list-title"><strong>Pages</strong><button type="button" onClick={() => { setPage(blankPage()); setMessage(''); }}>New page</button></div>
        <button className="template-action" type="button" onClick={startAnthemPage}>Start anthem page</button>
        <button className="template-action" type="button" onClick={startPtaPage}>Start PTA felicitation page</button>
        {pages.map((item) => <button className={`managed-list-item${item.slug === page.slug ? ' selected' : ''}`} type="button" key={item._id} onClick={() => selectPage(item)}><strong>{item.title}</strong><span>/{item.slug} · {item.status}</span></button>)}
        {!pages.length && <p className="muted">No pages have been saved yet.</p>}
      </aside>

      <form className="content-editor" onSubmit={submitPage}>
        <div className="editor-fields">
          <label>Page title<input value={page.title} onChange={(event) => setPage((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label>Page address<input value={page.slug} onChange={(event) => setPage((current) => ({ ...current, slug: event.target.value.replace(/\s+/g, '-').toLowerCase() }))} pattern="[a-z0-9-]+" required /></label>
          <label>Visibility<select value={page.status} onChange={(event) => setPage((current) => ({ ...current, status: event.target.value as ManagedPage['status'] }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        </div>
        <div className="editor-section-heading"><div><small>PAGE CONTENT</small><h3>Text and image sections</h3></div><button type="button" onClick={() => setPage((current) => ({ ...current, sections: [...current.sections, { key: `section-${current.sections.length + 1}`, heading: '', body: '', order: current.sections.length }] }))}>Add section</button></div>
        {page.sections.map((section, index) => <fieldset className="editable-section" key={`${index}-${section.key}`}>
          <legend>Section {index + 1}</legend>
          <button className="remove-section" type="button" aria-label={`Remove section ${index + 1}`} onClick={() => { setSectionImageDrafts((current) => { const next = { ...current }; delete next[section.key]; return next; }); setPage((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) })); }}>Remove</button>
          <div className="editor-fields">
            <label>Section key<input value={section.key} onChange={(event) => updateSection(index, { key: event.target.value })} required /></label>
            <label>Heading<input value={section.heading ?? ''} onChange={(event) => updateSection(index, { heading: event.target.value })} /></label>
            <label className="wide-field">Text<textarea rows={5} value={section.body ?? ''} onChange={(event) => updateSection(index, { body: event.target.value })} /></label>
            <div className="section-image-field wide-field">
              <span>Section image</span>
              <div className="section-image-sources" role="group" aria-label={`Image source for section ${index + 1}`}>
                <button type="button" aria-pressed={(sectionImageDrafts[section.key]?.source ?? 'library') === 'library'} onClick={() => updateSectionImage(section.key, { source: 'library' })}>Image library</button>
                {canManageMedia && <><button type="button" aria-pressed={sectionImageDrafts[section.key]?.source === 'url'} onClick={() => updateSectionImage(section.key, { source: 'url' })}>Paste URL</button><button type="button" aria-pressed={sectionImageDrafts[section.key]?.source === 'upload'} onClick={() => updateSectionImage(section.key, { source: 'upload' })}>Upload file</button></>}
              </div>
              {(sectionImageDrafts[section.key]?.source ?? 'library') === 'library' && <select value={section.mediaKey ?? ''} onChange={(event) => updateSection(index, { mediaKey: event.target.value || undefined })}><option value="">No image</option>{section.mediaKey && !sectionMedia.some((asset) => asset.key === section.mediaKey) && <option value={section.mediaKey}>Unavailable image ({section.mediaKey})</option>}{sectionMedia.map((asset) => <option value={asset.key} key={asset.key}>{asset.key} · {asset.altText}</option>)}</select>}
              {sectionImageDrafts[section.key]?.source === 'url' && <label>Direct image URL<input type="url" value={sectionImageDrafts[section.key]?.url ?? ''} onChange={(event) => updateSectionImage(section.key, { url: event.target.value })} placeholder="https://.../photo.jpg" /><small>Social media post or profile links often are not direct image URLs. Use a public image link or upload the image.</small></label>}
              {sectionImageDrafts[section.key]?.source === 'upload' && <label>Choose image<input type="file" accept="image/*" onChange={(event) => updateSectionImage(section.key, { file: event.target.files?.[0] })} /><small>Up to 10 MB. Files upload to Cloudinary when you save the page.</small></label>}
            </div>
            {sectionMedia.find((asset) => asset.key === section.mediaKey) && <img className="section-image-preview" src={sectionMedia.find((asset) => asset.key === section.mediaKey)?.url} alt="" />}
          </div>
        </fieldset>)}
        {!page.sections.length && <p className="muted">Add a section for each piece of information. Text and image keys stay editable.</p>}
        <button className="save-content" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save page'}</button>
      </form>
    </div> : tab === 'notices' && canManageContent ? <div className="content-manager-layout notice-layout">
      <form className="content-editor notice-editor" onSubmit={submitNotice}>
        <div><small>NOTICE BOARD</small><h3>Create a school announcement</h3><p>Schedule updates for families, students, staff, or alumni. Only public published notices appear on the landing page.</p></div>
        <div className="editor-fields">
          <label>Notice title<input value={noticeDraft.title} onChange={(event) => setNoticeDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label>Category<input value={noticeDraft.category} onChange={(event) => setNoticeDraft((current) => ({ ...current, category: event.target.value }))} required /></label>
          <label>Audience<select value={noticeDraft.audience} onChange={(event) => setNoticeDraft((current) => ({ ...current, audience: event.target.value as NoticeRecord['audience'] }))}><option value="public">Public</option><option value="students">Students</option><option value="parents">Parents</option><option value="staff">Staff</option><option value="alumni">Alumni</option></select></label>
          <label>Status<select value={noticeDraft.status} onChange={(event) => setNoticeDraft((current) => ({ ...current, status: event.target.value as NoticeRecord['status'] }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <label>Publish date<input type="datetime-local" value={noticeDraft.publishAt} onChange={(event) => setNoticeDraft((current) => ({ ...current, publishAt: event.target.value }))} required /></label>
          <label>Expiry date (optional)<input type="datetime-local" value={noticeDraft.expiresAt} onChange={(event) => setNoticeDraft((current) => ({ ...current, expiresAt: event.target.value }))} /></label>
          <label className="wide-field">Message<textarea rows={6} value={noticeDraft.body} onChange={(event) => setNoticeDraft((current) => ({ ...current, body: event.target.value }))} required /></label>
        </div>
        <button className="save-content" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save notice'}</button>
      </form>
      <aside className="managed-list notice-list" aria-label="Saved notices">
        <div className="managed-list-title"><strong>Latest notices</strong><button type="button" onClick={() => setNoticeDraft(blankNotice())}>Clear draft</button></div>
        {notices.length ? notices.map((notice) => <article key={notice._id} className="notice-item"><strong>{notice.title}</strong><span>{notice.category} · {notice.audience}</span><small>{notice.status} · {new Date(notice.publishAt).toLocaleString()}</small></article>) : <p className="muted">No notices have been published yet.</p>}
      </aside>
    </div> : tab === 'media' && canManageMedia ? <div className="content-manager-layout media-layout">
      <form className="content-editor media-editor" onSubmit={submitMedia}>
        <div><small>IMAGE LIBRARY</small><h3>Add or replace a school image</h3><p>The image key is a reference name used by page sections. Add an image here, then choose it in the section image list.</p></div>
        <label>Library reference (optional)<input value={media.key} onChange={(event) => setMedia((current) => ({ ...current, key: event.target.value }))} placeholder="Generated from section or image description" /><small>Page sections will use this automatically when the image is added there.</small></label>
        <div className="media-source-switch" role="group" aria-label="Image source"><button type="button" aria-pressed={mediaSource === 'url'} onClick={() => setMediaSource('url')}>Paste image URL</button><button type="button" aria-pressed={mediaSource === 'upload'} onClick={() => setMediaSource('upload')}>Upload from device</button></div>
        {mediaSource === 'url' ? <label>Direct image URL<input type="url" value={media.url} onChange={(event) => setMedia((current) => ({ ...current, url: event.target.value }))} placeholder="https://.../photo.jpg" required /><small>Use a direct public image link. Social media post or profile links often do not load as images.</small></label> : <label>Choose image<input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} required /><small>Images up to 10 MB. Uploads require Cloudinary credentials on the server.</small></label>}
        <label>Alternative text<input value={media.altText} onChange={(event) => setMedia((current) => ({ ...current, altText: event.target.value }))} required /></label>
        <label>Website section<input value={media.section} onChange={(event) => setMedia((current) => ({ ...current, section: event.target.value }))} placeholder="PTA felicitation" /></label>
        <button className="save-content" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save image reference'}</button>
      </form>
      <div className="managed-media-list"><small>ACTIVE IMAGE REFERENCES</small>{mediaAssets.map((asset) => <button className="managed-media-item" type="button" key={asset._id} onClick={() => setMedia({ key: asset.key, url: asset.url, altText: asset.altText, section: asset.section ?? '' })}><img src={asset.url} alt="" loading="lazy" /><span><strong>{asset.key}</strong><small>{asset.section || asset.altText} · v{asset.version}</small></span></button>)}{!mediaAssets.length && <p className="muted">No images have been registered yet.</p>}</div>
    </div> : <p className="muted">Your account does not have a content-management permission.</p>}
  </section>;
}