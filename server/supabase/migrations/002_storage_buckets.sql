-- ============================================================
-- Robe — Storage Buckets Setup
-- ============================================================
-- Run this in Supabase SQL Editor AFTER the initial schema migration

-- ── Create Storage Buckets ───────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe-images', 'wardrobe-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ── Storage Policies: wardrobe-images ────────────────────────

-- Anyone can view wardrobe images (public bucket)
CREATE POLICY "Public wardrobe image access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'wardrobe-images');

-- Users can upload to their own folder
CREATE POLICY "Users can upload wardrobe images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'wardrobe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own images
CREATE POLICY "Users can update their wardrobe images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'wardrobe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own images
CREATE POLICY "Users can delete their wardrobe images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'wardrobe-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ── Storage Policies: avatars ────────────────────────────────

CREATE POLICY "Public avatar access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
