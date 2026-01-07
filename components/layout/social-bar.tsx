'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Facebook, Instagram, Twitter, Youtube, MessageCircle } from 'lucide-react';

interface SocialMediaUrls {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
}

interface SocialIcon {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
  urlKey: keyof SocialMediaUrls;
}

const socialIcons: SocialIcon[] = [
  {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    glowColor: 'rgba(24, 119, 242, 0.5)',
    urlKey: 'facebook',
  },
  {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    glowColor: 'rgba(228, 64, 95, 0.5)',
    urlKey: 'instagram',
  },
  {
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    glowColor: 'rgba(29, 161, 242, 0.5)',
    urlKey: 'twitter',
  },
  {
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    glowColor: 'rgba(255, 0, 0, 0.5)',
    urlKey: 'youtube',
  },
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    glowColor: 'rgba(37, 211, 102, 0.5)',
    urlKey: 'whatsapp',
  },
];

export default function SocialBar() {
  const [socialUrls, setSocialUrls] = useState<SocialMediaUrls>({});
  const [loading, setLoading] = useState(true);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialUrls = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSocialUrls({
            facebook: data.facebook_url,
            instagram: data.instagram_url,
            twitter: data.twitter_url,
            youtube: data.youtube_url,
            whatsapp: data.whatsapp_url,
          });
        }
      } catch (error) {
        console.error('Error fetching social media URLs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialUrls();
  }, []);

  // Filter out social networks without configured URLs
  const activeSocialIcons = socialIcons.filter(
    (social) => socialUrls[social.urlKey]
  );

  // Don't render if no social URLs are configured or still loading
  if (loading || activeSocialIcons.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-[57px] z-40 w-full bg-black/80 backdrop-blur-md border-b border-white/10"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 py-3">
          {activeSocialIcons.map((social, index) => {
            const Icon = social.icon;
            const url = socialUrls[social.urlKey];

            return (
              <motion.a
                key={social.name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onHoverStart={() => setHoveredIcon(social.name)}
                onHoverEnd={() => setHoveredIcon(null)}
                className="relative group cursor-pointer"
                aria-label={`Visit our ${social.name} page`}
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-lg"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: hoveredIcon === social.name ? 0.8 : 0,
                    scale: hoveredIcon === social.name ? 1.5 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    backgroundColor: social.glowColor,
                  }}
                />

                {/* Icon container */}
                <motion.div
                  className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm transition-colors duration-300"
                  animate={{
                    backgroundColor:
                      hoveredIcon === social.name
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-300"
                    style={{
                      color:
                        hoveredIcon === social.name ? social.color : '#ffffff',
                    }}
                  />
                </motion.div>

                {/* Tooltip */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: hoveredIcon === social.name ? 1 : 0,
                    y: hoveredIcon === social.name ? 0 : 10,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
                >
                  <div className="px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    {social.name}
                  </div>
                </motion.div>

                {/* Ripple effect on hover */}
                {hoveredIcon === social.name && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: social.color }}
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                )}
              </motion.a>
            );
          })}
        </div>
      </div>

      {/* Animated gradient line at bottom */}
      <motion.div
        className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 100%',
        }}
      />
    </motion.div>
  );
}
