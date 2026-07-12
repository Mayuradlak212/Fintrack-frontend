import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAppDispatch, useAppSelector } from '../store';
import { updateProfile } from '../store/authSlice';
import { Camera, Save, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from '../utils/toast';
import { motion } from 'framer-motion';
import Head from 'next/head';
import { useRouter } from 'next/router';
import pkg from '../package.json';

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | undefined>(undefined);
  const [avatarMimeType, setAvatarMimeType] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setAvatarBase64(user.avatar_base64 || undefined);
      setAvatarMimeType(user.avatar_mime_type || undefined);
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = (reader.result as string).split(',')[1];
      setAvatarBase64(base64Str);
      setAvatarMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    const cleanEmail = email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Invalid email address');
      return;
    }

    const rawPhone = phone.trim();
    let cleanPhone = undefined;
    if (rawPhone) {
      const digitsOnly = rawPhone.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
      cleanPhone = digitsOnly;
    }

    setIsSaving(true);
    try {
      await dispatch(updateProfile({
        name,
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
        avatar_base64: avatarBase64,
        avatar_mime_type: avatarMimeType,
      })).unwrap();
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      toast.error((err as string) || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const avatarSrc = avatarBase64 ? `data:${avatarMimeType};base64,${avatarBase64}` : null;

  return (
    <Layout>
      <Head>
        <title>Profile | FinTrack</title>
      </Head>

      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary">Your Profile</h1>
          <p className="text-txt-muted mt-1">Manage your personal information and avatar.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl p-8 border border-white/[0.05]"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full overflow-hidden bg-bg-secondary border-2 border-white/[0.05] flex items-center justify-center relative">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-txt-muted" />
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-white" />
                    <span className="text-xs font-medium text-white">Change</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-5 w-full">
                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-txt-primary outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-txt-primary outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      // Strip anything that isn't a digit, +, space, -, or ()
                      const clean = e.target.value.replace(/[^\d+\s\-().]/g, '');
                      setPhone(clean);
                    }}
                    placeholder="+91 98765 43210"
                    maxLength={15}
                    className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-sm text-txt-primary outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.05] flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-accent-light border border-accent hover:bg-accent/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Version footer */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-txt-muted/40 font-semibold tracking-wider uppercase">
              App Version {pkg.version}
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
