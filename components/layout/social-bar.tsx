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
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.socialMedia) {
          setUrls(data.socialMedia);
        }
      })
      .catch((error) => console.error('Error fetching social media URLs:', error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const socialLinks = [
    { icon: Facebook, url: urls.facebook, label: 'Facebook', color: '#1877F2' },
    { icon: Instagram, url: urls.instagram, label: 'Instagram', color: '#E4405F' },
    { icon: Twitter, url: urls.twitter, label: 'Twitter', color: '#1DA1F2' },
    { icon: Youtube, url: urls.youtube, label: 'YouTube', color: '#FF0000' },
    { icon: MapPin, url: urls.googleMaps, label: 'Location', color: '#4285F4' },
  ].filter((link) => link.url);

  if (socialLinks.length === 0) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-black/90 backdrop-blur-md border-b border-gray-800"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 py-3">
          {socialLinks.map(({ icon: Icon, url, label, color }) => (
            <motion.a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              whileHover={{ scale: 1.2, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group relative"
            >
              <motion.div
                className="relative z-10"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Icon
                  className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(0,240,255,0))',
                  }}
                />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-70 transition-opacity"
                style={{ backgroundColor: color }}
              />
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
