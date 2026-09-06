import { useEffect, useState } from 'react';
import { fetchImageObjectUrl } from '../services/imagesApi';

/**
 * Object URL for an authenticated image, or null while loading / on failure.
 * The images endpoint needs a bearer token, so the bytes are fetched as a blob
 * rather than pointed at with <img src>, and the URL is revoked when the id
 * changes or the component unmounts.
 */
export default function useImageObjectUrl(imageId) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return undefined;
    }

    let active = true;
    let created = null;

    fetchImageObjectUrl(imageId)
      .then((objectUrl) => {
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        created = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => {
        // A missing or unreadable image just hides the picture; the rest of
        // the page still renders.
        if (active) {
          setUrl(null);
        }
      });

    return () => {
      active = false;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [imageId]);

  return url;
}
