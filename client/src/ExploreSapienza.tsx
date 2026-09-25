import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicMedia, publicPage, publishedPages, type ManagedPage } from './api';
import './explore-sapienza.css';
import './explore-directory.css';

type PublicMedia = { key: string; url: string; altText: string };

export function ExploreDirectory() {
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    publishedPages().then(({ pages: result }) => { if (active) setPages(result); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load pages'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredPages = normalizedSearch ? pages.filter((page) => [
    page.title,
    page.slug,
    ...page.sections.flatMap((section) => [section.heading, section.body])
  ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))) : pages;

  return <section className="explore-page">
    <Link className="explore-back" to="/">Sapienza <span aria-hidden="true">/</span> Home</Link>
    <header className="explore-heading"><small>DISCOVER OUR SCHOOL</small><h1>Explore Sapienza</h1><p>Stories, traditions, and moments from our school community.</p></header>
    {loading ? <p className="muted" aria-live="polite">Loading school pages...</p> : error ? <div className="explore-fetch-error"><p className="explore-message" role="alert">{error}</p><button type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button></div> : pages.length ? <>
      <div className="explore-filter"><label htmlFor="explore-search">Find a page</label><input id="explore-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages and stories" /><span aria-live="polite">{filteredPages.length} of {pages.length} {pages.length === 1 ? 'page' : 'pages'}</span></div>
      {filteredPages.length ? <div className="explore-directory">{filteredPages.map((page) => <Link className="explore-page-link" to={`/explore/${encodeURIComponent(page.slug)}`} key={page._id}>
      <span><small>SAPIENZA STORIES</small><strong>{page.title}</strong><span>{page.sections.length} {page.sections.length === 1 ? 'section' : 'sections'}</span></span><span className="explore-arrow" aria-hidden="true">↗</span>
      </Link>)}</div> : <p className="muted explore-no-results">No published pages match “{search.trim()}”. <button type="button" onClick={() => setSearch('')}>Clear search</button></p>}
    </> : <p className="muted">School stories and pages will appear here as they are published.</p>}
  </section>;
}

export function ExplorePage() {
  const { slug = '' } = useParams();
  const [page, setPage] = useState<ManagedPage | null>(null);
  const [media, setMedia] = useState<PublicMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([publicPage(slug), publicMedia()])
      .then(([pageResult, mediaResult]) => {
        if (active) {
          setPage(pageResult.page);
          setMedia(mediaResult.media);
        }
      })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load this page'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <section className="explore-page"><p className="muted" aria-live="polite">Loading page...</p></section>;
  if (error || !page) return <section className="explore-page"><Link className="explore-back" to="/explore">← All pages</Link><div className="explore-empty"><small>PAGE UNAVAILABLE</small><h1>We couldn't find that page.</h1><p>{error || 'This page may have been unpublished.'}</p><Link className="text-button" to="/explore">Browse published pages</Link></div></section>;

  return <article className="explore-page explore-article">
    <Link className="explore-back" to="/explore">Explore Sapienza <span aria-hidden="true">/</span> All pages</Link>
    <header className="explore-heading"><small>SAPIENZA STORIES</small><h1>{page.title}</h1></header>
    <div className="explore-sections">{[...page.sections].sort((left, right) => (left.order ?? 0) - (right.order ?? 0)).map((section, index) => {
      const image = media.find((asset) => asset.key === section.mediaKey);
      return <section className="explore-content-section" key={`${section.key}-${index}`}>
        <div className="explore-section-copy">{section.heading && <h2>{section.heading}</h2>}{section.body && <p>{section.body}</p>}</div>
        {image && <img src={image.url} alt={image.altText} loading="lazy" />}
      </section>;
    })}</div>
  </article>;
}