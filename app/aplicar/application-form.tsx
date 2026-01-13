'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type Role = 'barbero' | 'estilista';

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  role: Role | '';
  yearsExperience: string;
  instagram: string;
  portfolioUrl: string;
  message: string;
  company: string; // honeypot
};

const initialState: FormState = {
  fullName: '',
  email: '',
  phone: '',
  role: '',
  yearsExperience: '',
  instagram: '',
  portfolioUrl: '',
  message: '',
  company: '',
};

function normalizePhone(value: string) {
  return value.replace(/[^0-9+()\-\s]/g, '').slice(0, 32);
}

export function ApplicationForm() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length >= 2 &&
      form.email.trim().length >= 5 &&
      form.phone.trim().length >= 7 &&
      (form.role === 'barbero' || form.role === 'estilista')
    );
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canSubmit) {
      toast({
        title: 'Missing information',
        description: 'Please provide your name, email, phone, and role (barber/stylist).',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/job-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        toast({
          title: 'Unable to submit',
          description: data?.error || 'Please try again in a few seconds.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Application submitted',
        description: 'Thanks — we’ll reach out soon.',
      });
      setForm(initialState);
    } catch {
      toast({
        title: 'Network error',
        description: 'We could not submit your application. Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-800 bg-black/35 p-4 sm:p-5 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: normalizePhone(e.target.value) }))}
            placeholder="(xxx) xxx-xxxx"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v as Role }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="barbero">Barber</SelectItem>
              <SelectItem value="estilista">Stylist</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearsExperience">Years of experience (optional)</Label>
          <Input
            id="yearsExperience"
            value={form.yearsExperience}
            onChange={(e) => setForm((s) => ({ ...s, yearsExperience: e.target.value.slice(0, 16) }))}
            placeholder="e.g. 3"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram (optional)</Label>
          <Input
            id="instagram"
            value={form.instagram}
            onChange={(e) => setForm((s) => ({ ...s, instagram: e.target.value }))}
            placeholder="@tuusuario"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolioUrl">Portfolio / Link (optional)</Label>
          <Input
            id="portfolioUrl"
            value={form.portfolioUrl}
            onChange={(e) => setForm((s) => ({ ...s, portfolioUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
          placeholder="Tell us where you’ve worked, your availability, etc."
          rows={4}
        />
      </div>

      {/* Honeypot (bots). Keep it visually hidden but present in DOM. */}
      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          value={form.company}
          onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="pt-1 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">By submitting, you agree that we may contact you by email or phone.</p>
        <Button type="submit" disabled={!canSubmit || submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </div>
    </form>
  );
}
