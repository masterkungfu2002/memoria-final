import { createClient } from '@/lib/supabase/server';
import { AlbumEditForm } from '@/components/admin/AlbumEditForm';
import { redirect } from 'next/navigation';
 
export default async function EditAlbumPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();
 
  const { data: album, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .single();
 
  if (error || !album) {
    redirect('/admin?error=album-not-found');
  }
 
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#e5e5e5',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <a href="/admin" style={{ color: '#C6A97E', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Admin
          </a>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#F5EFE7' }}>
          Edit Album
        </h1>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          ID: <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{id}</code>
        </p>
        <AlbumEditForm album={album} />
      </div>
    </div>
  );
}
