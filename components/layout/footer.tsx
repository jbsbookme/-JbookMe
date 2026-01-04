'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  // Hide footer on ALL pages (moved to settings menu)
  return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">
              <span className="text-[#00f0ff]">Book</span>
              <span className="text-[#ffd700]">Me</span>
            </h3>
            <p className="text-gray-400 text-sm">
              The best barbershop experience with highly skilled professionals.
            </p>
            {/* Social Media */}
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#00f0ff] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#ffd700] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#00f0ff] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/reservar" className="text-gray-400 hover:text-[#00f0ff] text-sm transition-colors">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/barberos" className="text-gray-400 hover:text-[#00f0ff] text-sm transition-colors">
                  Our Barbers
                </Link>
              </li>
              <li>
                <Link href="/galeria" className="text-gray-400 hover:text-[#00f0ff] text-sm transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/resenas" className="text-gray-400 hover:text-[#00f0ff] text-sm transition-colors">
                  Reviews
                </Link>
              </li>
              <li>
                <Link href="/asistente" className="text-gray-400 hover:text-[#00f0ff] text-sm transition-colors">
                  Virtual Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start text-gray-400 text-sm">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 text-[#ffd700] flex-shrink-0" />
                <span>123 Main Street, Suite 100, City</span>
              </li>
              <li className="flex items-center text-gray-400 text-sm">
                <Phone className="w-4 h-4 mr-2 text-[#ffd700]" />
                <a href="tel:+15551234567" className="hover:text-[#00f0ff] transition-colors">
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-center text-gray-400 text-sm">
                <Mail className="w-4 h-4 mr-2 text-[#ffd700]" />
                <a href="mailto:info@bookme.com" className="hover:text-[#00f0ff] transition-colors">
                  info@bookme.com
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-white font-semibold mb-4">Hours</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex justify-between">
                <span>Monday - Saturday:</span>
                <span className="text-white">9:00 AM - 8:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday:</span>
                <span className="text-white">10:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800 my-8"></div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-gray-500 text-sm text-center md:text-left">
            © {currentYear} JBookMe. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link
              href="/privacidad"
              className="text-gray-500 hover:text-[#00f0ff] text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/privacidad"
              className="text-gray-500 hover:text-[#00f0ff] text-sm transition-colors"
            >
              Terms and Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
