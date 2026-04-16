'use client';
 
import { useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Album } from '@/lib/types';
 
function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
 
type PhotoItem = { url: string; caption: string; title?: string };
 
export function AlbumEditForm({ album }: { album: Album }) {
  const originalId = album.id;
 
  const [albumId, setAlbumId] = useState(album.id);
  const [recipientName, setRecipientName] = useState(album.recipient_name || '');
  const [videoUrl, setVideoUrl] = useState(album.video_url || '');
  const [musicUrl, setMusicUrl] = useState((album as any).background_music_url || '');
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (album.photos || []).map((p: any) => ({
      url: p.url || '',
      caption: p.caption || p.description || p.text || '',
      title: p.title || p.name || '',
    }))
  );
 
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showIdWarning, setShowIdWarning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
 
  /* ── Photo management ── */
  const updatePhoto = (i: number, field: keyof PhotoItem, value: string) => {
    setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };
 
  const removePhoto = (i: number) => {
    if (!confirm(`Remove photo ${i + 1}?`)) return;
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
  };
 
  const movePhoto = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    setPhotos(prev => {
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };
 
  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const supabase = getSupabase();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${albumId}/${Date.now()}.${ext}`;
 
      const { error } = await supabase.storage
        .from('albums-images')
        .upload(path, file, { upsert: true });
 
      if (error) throw error;
 
      const { data: urlData } = supabase.storage
        .from('albums-images')
        .getPublicUrl(path);
 
      setPhotos(prev => [...prev, { url: urlData.publicUrl, caption: '', title: '' }]);
      setMsg({ type: 'ok', text: 'Photo uploaded!' });
    } catch (e: any) {
      setMsg({ type: 'err', text: `Upload failed: ${e.message}` });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
 
  /* ── Save ── */
  const save = async () => {
    const idChanged = albumId !== originalId;
 
    if (idChanged && !showIdWarning) {
      setShowIdWarning(true);
      return;
    }
 
    if (!recipientName.trim()) {
      setMsg({ type: 'err', text: 'Recipient name is required' });
      return;
    }
 
    setSaving(true);
    setMsg(null);
 
    try {
      const supabase = getSupabase();
 
      const updateData: any = {
        recipient_name: recipientName.trim(),
        video_url: videoUrl.trim() || null,
        background_music_url: musicUrl.trim() || null,
        cover_image: photos[0]?.url || null,
        photos: photos.map(p => ({
          url: p.url,
          caption: p.caption,
          ...(p.title ? { title: p.title } : {}),
        })),
      };
 
      if (idChanged) {
        // ID changed: insert new + delete old
        const { error: insertError } = await supabase
          .from('albums')
          .insert({ ...updateData, id: albumId, admin_id: album.admin_id, created_at: album.created_at });
 
        if (insertError) throw insertError;
 
        // Move feedback to new ID
        await supabase
          .from('feedback')
          .update({ album_id: albumId })
          .eq('album_id', originalId);
 
        // Delete old album
        const { error: deleteError } = await supabase
          .from('albums')
          .delete()
          .eq('id', originalId);
 
        if (deleteError) throw deleteError;
 
        setMsg({ type: 'ok', text: `Saved! ID changed. Redirecting...` });
        setTimeout(() => {
          window.location.href = `/admin/albums/${albumId}/edit`;
        }, 1500);
      } else {
        const { error } = await supabase
          .from('albums')
          .update(updateData)
          .eq('id', originalId);
 
        if (error) throw error;
        setMsg({ type: 'ok', text: 'Album saved!' });
      }
 
      setShowIdWarning(false);
    } catch (e: any) {
      setMsg({ type: 'err', text: `Save failed: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };
 
  /* ══════════════════════════════════ */
  /* RENDER                             */
  /* ══════════════════════════════════ */
 
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: '#1a1a1a',
    border: '1px solid #333', borderRadius: '8px', fontSize: '14px',
    color: '#e5e5e5', outline: 'none', fontFamily: 'inherit',
  };
 
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: '#999', letterSpacing: '.5px',
    textTransform: 'uppercase', marginBottom: '6px', display: 'block',
  };
 
  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
  };
 
  return (
    <div>
      {/* Album ID */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Album ID</label>
        <input
          value={albumId}
          onChange={e => { setAlbumId(e.target.value); setShowIdWarning(false); }}
          style={{ ...inputStyle, borderColor: albumId !== originalId ? '#e74c3c' : '#333' }}
        />
        {albumId !== originalId && (
          <div style={{
            marginTop: '8px', padding: '10px 12px', background: 'rgba(231,76,60,.1)',
            border: '1px solid rgba(231,76,60,.3)', borderRadius: '8px',
            fontSize: '12px', color: '#e74c3c', lineHeight: 1.6,
          }}>
            ⚠️ <strong>CẢNH BÁO:</strong> Đổi ID sẽ làm tất cả QR card vật lý đang trỏ vào <code>/album/{originalId}</code> bị chết (404). 
            Chỉ đổi nếu chưa in QR hoặc sẽ in lại QR mới.
          </div>
        )}
      </div>
 
      {/* Recipient Name */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Recipient Name</label>
        <input value={recipientName} onChange={e => setRecipientName(e.target.value)} style={inputStyle} placeholder="Mom" />
      </div>
 
      {/* Video URL */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Video URL (YouTube or direct)</label>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={inputStyle} placeholder="https://youtube.com/watch?v=..." />
      </div>
 
      {/* Background Music URL */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Background Music URL</label>
        <input value={musicUrl} onChange={e => setMusicUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
      </div>
 
      {/* Photos */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Photos ({photos.length})</label>
 
        {photos.map((photo, i) => (
          <div key={i} style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
            padding: '12px', marginBottom: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {/* Thumbnail */}
              <div style={{
                width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden',
                background: '#111', flexShrink: 0,
              }}>
                {photo.url && (
                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
 
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#C6A97E', marginBottom: '4px' }}>
                  Photo {i + 1}
                </div>
                <input
                  value={photo.url}
                  onChange={e => updatePhoto(i, 'url', e.target.value)}
                  style={{ ...inputStyle, fontSize: '11px', padding: '6px 8px' }}
                  placeholder="Image URL"
                />
              </div>
 
              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => movePhoto(i, -1)} disabled={i === 0}
                  style={{ ...btnSmall, opacity: i === 0 ? .3 : 1 }}>↑</button>
                <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1}
                  style={{ ...btnSmall, opacity: i === photos.length - 1 ? .3 : 1 }}>↓</button>
                <button onClick={() => removePhoto(i)}
                  style={{ ...btnSmall, color: '#e74c3c', borderColor: '#e74c3c' }}>✕</button>
              </div>
            </div>
 
            {/* Title */}
            <input
              value={photo.title || ''}
              onChange={e => updatePhoto(i, 'title', e.target.value)}
              style={{ ...inputStyle, fontSize: '12px', padding: '7px 10px', marginBottom: '6px' }}
              placeholder="Title (optional)"
            />
 
            {/* Caption */}
            <textarea
              value={photo.caption}
              onChange={e => updatePhoto(i, 'caption', e.target.value)}
              style={{ ...inputStyle, fontSize: '12px', padding: '7px 10px', resize: 'vertical', minHeight: '50px' }}
              placeholder="Caption text..."
            />
          </div>
        ))}
 
        {/* Add photo */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={() => setPhotos(prev => [...prev, { url: '', caption: '', title: '' }])}
            style={{ ...btnPrimary, flex: 1, background: '#1a1a1a', border: '1px dashed #444' }}>
            + Add photo (URL)
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ ...btnPrimary, flex: 1, background: '#1a1a1a', border: '1px dashed #C6A97E', color: '#C6A97E' }}>
            {uploading ? 'Uploading...' : '📁 Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); }} />
        </div>
      </div>
 
      {/* Album Link */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Album Preview Link</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={`${typeof window !== 'undefined' ? window.location.origin : ''}/album/${albumId}`} readOnly style={{ ...inputStyle, opacity: .7 }} />
          <button onClick={() => window.open(`/album/${albumId}`, '_blank')}
            style={{ ...btnPrimary, whiteSpace: 'nowrap', padding: '10px 16px' }}>
            Open ↗
          </button>
        </div>
      </div>
 
      {/* ID change confirmation */}
      {showIdWarning && (
        <div style={{
          padding: '16px', background: 'rgba(231,76,60,.12)',
          border: '1px solid rgba(231,76,60,.4)', borderRadius: '10px',
          marginBottom: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e74c3c', marginBottom: '8px' }}>
            ⚠️ Xác nhận đổi Album ID
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '12px', lineHeight: 1.6 }}>
            ID cũ: <code>{originalId}</code><br />
            ID mới: <code>{albumId}</code><br />
            Tất cả QR card trỏ vào ID cũ sẽ bị 404!
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={() => { setAlbumId(originalId); setShowIdWarning(false); }}
              style={{ ...btnPrimary, background: '#333' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              style={{ ...btnPrimary, background: '#e74c3c', color: '#fff' }}>
              {saving ? 'Saving...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      )}
 
      {/* Save button */}
      {!showIdWarning && (
        <button onClick={save} disabled={saving}
          style={{
            ...btnPrimary,
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg,#b89a6e,#C6A97E)',
            color: '#0B0B0B', fontWeight: 700, fontSize: '15px',
            opacity: saving ? .5 : 1,
          }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
 
      {/* Status message */}
      {msg && (
        <div style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
          fontSize: '13px', textAlign: 'center',
          background: msg.type === 'ok' ? 'rgba(46,204,113,.12)' : 'rgba(231,76,60,.12)',
          color: msg.type === 'ok' ? '#2ecc71' : '#e74c3c',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(46,204,113,.3)' : 'rgba(231,76,60,.3)'}`,
        }}>
          {msg.text}
        </div>
      )}
 
      <div style={{ height: '60px' }} />
    </div>
  );
}
 
/* ── Button styles ── */
const btnSmall: React.CSSProperties = {
  width: '26px', height: '26px', background: 'none',
  border: '1px solid #444', borderRadius: '6px', color: '#888',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '12px', padding: 0,
};
 
const btnPrimary: React.CSSProperties = {
  padding: '10px 14px', background: '#222', border: '1px solid #444',
  borderRadius: '8px', color: '#e5e5e5', cursor: 'pointer',
  fontSize: '13px', fontFamily: 'inherit',
};
