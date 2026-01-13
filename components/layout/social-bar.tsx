'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Youtube, MapPin } from 'lucide-react';

interface SocialMediaUrls {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  googleMaps?: string;
}

export default function SocialBar() {
  const [urls, setUrls] = useState<SocialMediaUrls>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();

        if (data?.socialMedia) {
          setUrls(data.socialMedia);
        }
      } catch (error) {
        if ((error as { name?: string } | null)?.name !== 'AbortError') {
          console.error('Error fetching social media URLs:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, []);

  if (loading) return null;

  const socialLinks = [
    { icon: Facebook, url: urls.facebook, label: 'Facebook' },
    { icon: Instagram, url: urls.instagram, label: 'Instagram' },
    { icon: Twitter, url: urls.twitter, label: 'Twitter' },
    { icon: Youtube, url: urls.youtube, label: 'YouTube' },
    { icon: MapPin, url: urls.googleMaps, label: 'Location' },
  ].filter((link) => Boolean(link.url));

  if (socialLinks.length === 0) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-background/90 backdrop-blur-md border-b border-border"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 py-3">
          {socialLinks.map(({ icon: Icon, url, label }) => (
            <motion.a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              whileHover={{ scale: 1.2, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group"
            >
              <motion.div
                className="relative"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
