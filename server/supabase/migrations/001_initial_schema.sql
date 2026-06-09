-- ============================================================
-- Robe — Initial Database Schema
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ── Profiles (extends Supabase auth.users) ───────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Style Profiles ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body_type TEXT,
    face_shape TEXT,
    hairstyle TEXT,
    height_cm REAL,
    weight_kg REAL,
    skin_tone TEXT,
    style_preferences JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ── Wardrobe Items ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wardrobe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subcategory TEXT,
    color TEXT,
    brand TEXT,
    occasion_tags TEXT[] DEFAULT '{}',
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Outfit Suggestions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.outfit_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    occasion TEXT,
    formality TEXT,
    item_ids UUID[] NOT NULL,
    confidence_score REAL,
    reasoning TEXT,
    is_saved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Chat Messages ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    outfit_refs UUID[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════

-- ── Profiles RLS ─────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- ── Style Profiles RLS ───────────────────────────────────────

ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style profile"
    ON public.style_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own style profile"
    ON public.style_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style profile"
    ON public.style_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ── Wardrobe Items RLS ───────────────────────────────────────

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wardrobe"
    ON public.wardrobe_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own wardrobe"
    ON public.wardrobe_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wardrobe items"
    ON public.wardrobe_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wardrobe items"
    ON public.wardrobe_items FOR DELETE
    USING (auth.uid() = user_id);

-- ── Outfit Suggestions RLS ───────────────────────────────────

ALTER TABLE public.outfit_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own outfit suggestions"
    ON public.outfit_suggestions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfit suggestions"
    ON public.outfit_suggestions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfit suggestions"
    ON public.outfit_suggestions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfit suggestions"
    ON public.outfit_suggestions FOR DELETE
    USING (auth.uid() = user_id);

-- ── Chat Messages RLS ────────────────────────────────────────

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
    ON public.chat_messages FOR DELETE
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES (Performance)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_style_profiles_user ON public.style_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user ON public.wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category ON public.wardrobe_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_outfit_suggestions_user ON public.outfit_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_suggestions_saved ON public.outfit_suggestions(user_id, is_saved);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP (Database Function + Trigger)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: runs after every new signup in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_style_profiles_updated_at
    BEFORE UPDATE ON public.style_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
