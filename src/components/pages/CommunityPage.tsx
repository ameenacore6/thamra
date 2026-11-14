import React, { useEffect, useMemo, useState } from 'react';
import {
  Heart,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
} from 'lucide-react';
import {
  addCommentApi,
  createCommunityPostApi,
  fetchCommunityPosts,
  toggleLikePostApi,
} from '../../services/appApi';
import type {
  AppLanguage,
  CommunityCategory,
  CommunityPost,
  UserProfile,
} from '../../types/farm';

interface CommunityPageProps {
  language: AppLanguage;
  user: UserProfile | null;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ language, user }) => {
  const isAr = language === 'ar';
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CommunityCategory>('all');

  const [showCompose, setShowCompose] = useState(false);
  const [newCategory, setNewCategory] = useState<CommunityCategory>('qa');
  const [newTitle, setNewTitle] = useState('');
  const [newCropTag, setNewCropTag] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newAuthorName, setNewAuthorName] = useState(user?.name || '');
  const [posting, setPosting] = useState(false);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const actorId = user?.id || 'guest-browser';

  useEffect(() => {
    setLoading(true);
    fetchCommunityPosts()
      .then((list) => setPosts(list))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load posts.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.cropTag || '').toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery, categoryFilter]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const created = await createCommunityPostApi({
        category: newCategory,
        title: newTitle.trim(),
        body: newBody.trim(),
        cropTag: newCropTag.trim() || undefined,
        authorName: user?.name || newAuthorName.trim() || undefined,
      });
      setPosts((prev) => [created, ...prev]);
      setNewTitle('');
      setNewBody('');
      setNewCropTag('');
      setShowCompose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish post.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const updated = await toggleLikePostApi(postId, actorId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch {
      // ignore transient error
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;
    try {
      const updated = await addCommentApi({
        postId,
        text,
        authorName: user?.name || 'Bahrain Farmer',
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    }
  };

  const categoryLabel = (c: CommunityCategory) => {
    switch (c) {
      case 'qa':
        return isAr ? 'سؤال وجواب' : 'Q&A';
      case 'tip':
        return isAr ? 'نصيحة زراعية' : 'Farming Tip';
      case 'crop_discussion':
        return isAr ? 'نقاش محاصيل' : 'Crop Discussion';
      case 'announcement':
        return isAr ? 'تنبيه هام' : 'Announcement';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#535C21]" />
            <span>{isAr ? 'مجتمع المزارعين' : 'Farmers Community'}</span>
          </h1>
          <p className="text-xs text-[#535C21] mt-0.5">
            {isAr
              ? 'شارك الأسئلة والخبرات حول محاصيل البحرين والري والدورات الزراعية'
              : 'Questions, seasonal tips, crop discussions, and agricultural notices from local growers'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCompose((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#535C21] hover:bg-[#414919] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'منشور جديد' : 'New Post'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] px-4 py-2.5 text-xs text-[#1C250C]">
          {error}
        </div>
      )}

      {showCompose && (
        <form
          onSubmit={(e) => void handleCreatePost(e)}
          className="bg-white border border-[#535C21]/40 rounded-2xl p-4 space-y-3 text-xs"
        >
          <h2 className="text-sm font-bold text-[#1C250C]">
            {isAr ? 'نشر سؤال أو نصيحة للمجتمع' : 'Share a Question or Tip'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as CommunityCategory)}
              className="px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl font-semibold"
            >
              <option value="qa">{categoryLabel('qa')}</option>
              <option value="tip">{categoryLabel('tip')}</option>
              <option value="crop_discussion">{categoryLabel('crop_discussion')}</option>
              <option value="announcement">{categoryLabel('announcement')}</option>
            </select>
            <input
              type="text"
              value={newCropTag}
              onChange={(e) => setNewCropTag(e.target.value)}
              placeholder={isAr ? 'المحصول (مثال: طماطم)' : 'Crop tag (e.g. Tomatoes)'}
              className="px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
            />
            {!user && (
              <input
                type="text"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                placeholder={isAr ? 'اسمك (اختياري)' : 'Your name (optional)'}
                className="px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />
            )}
          </div>
          <input
            required
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={isAr ? 'عنوان المنشور' : 'Post title'}
            className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl font-semibold"
          />
          <textarea
            required
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={isAr ? 'اكتب التفاصيل أو التجربة الزراعية...' : 'Share details, irrigation experience, or question...'}
            className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-3 py-1.5 rounded-lg border border-[#D5D5D5] text-[#1C250C] cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={posting}
              className="px-4 py-1.5 rounded-lg bg-[#1C250C] text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              {posting ? (isAr ? 'جاري النشر...' : 'Publishing...') : isAr ? 'نشر' : 'Publish'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8E7D49] absolute top-2.5 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث في المنشورات أو المحاصيل...' : 'Search posts, tips, or crops...'}
            className="w-full ps-9 pe-3 py-2 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'qa', 'tip', 'crop_discussion', 'announcement'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#535C21] text-white'
                  : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C]'
              }`}
            >
              {cat === 'all' ? (isAr ? 'الكل' : 'All') : categoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <p className="text-xs text-[#8E7D49] px-2">
          {isAr ? 'جاري تحميل منشورات المجتمع...' : 'Loading community posts...'}
        </p>
      ) : (
        <div className="space-y-3.5">
          {filteredPosts.map((post) => {
            const liked = post.likedByUserIds.includes(actorId);
            return (
              <article
                key={post.id}
                className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-[#1C250C]">{post.authorName}</span>
                    {post.authorRegion && (
                      <span className="text-[#8E7D49]"> · {post.authorRegion}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {post.cropTag && (
                      <span className="px-2 py-0.5 rounded bg-[#DBAE83]/30 text-[#1C250C] font-medium">
                        {post.cropTag}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[#f3f2ee] text-[#535C21] font-semibold">
                      {categoryLabel(post.category)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#1C250C]">{post.title}</h3>
                  <p className="mt-1 text-xs text-[#535C21] leading-relaxed whitespace-pre-line">
                    {post.body}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-1 border-t border-[#D5D5D5]/70 text-xs">
                  <button
                    type="button"
                    onClick={() => void handleToggleLike(post.id)}
                    className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer ${
                      liked ? 'text-[#C85A32]' : 'text-[#8E7D49] hover:text-[#1C250C]'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    <span className="font-mono-tabular">{post.likes}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[#8E7D49]">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-mono-tabular">{post.comments.length}</span>
                  </span>
                </div>

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div className="space-y-1.5 bg-[#faf8f4] rounded-xl p-3 text-xs">
                    {post.comments.map((c) => (
                      <div key={c.id} className="border-b border-[#D5D5D5]/50 last:border-none pb-1.5 last:pb-0">
                        <span className="font-bold text-[#1C250C]">{c.authorName}: </span>
                        <span className="text-[#535C21]">{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAddComment(post.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={commentDrafts[post.id] || ''}
                    onChange={(e) =>
                      setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder={isAr ? 'أضف تعليقاً...' : 'Write a helpful comment...'}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#535C21] text-white hover:bg-[#414919] cursor-pointer"
                    aria-label={isAr ? 'إرسال تعليق' : 'Send comment'}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
