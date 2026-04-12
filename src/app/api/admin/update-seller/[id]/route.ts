import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify the caller is an authenticated admin
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('perfiles_usuario')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (profile?.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, email, activo } = body as { nombre?: string; email?: string; activo?: boolean };

  const adminClient = createAdminClient();

  // If activo is being toggled, update Supabase Auth ban status
  if (activo !== undefined) {
    const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
      ban_duration: activo ? 'none' : '87600h',
    });

    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 500 });
    }
  }

  // Update profile fields in perfiles_usuario
  const updateFields: Record<string, unknown> = {};
  if (nombre !== undefined) updateFields.nombre = nombre.trim();
  if (email !== undefined) updateFields.email = email.trim();
  if (activo !== undefined) updateFields.activo = activo;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const { data: updatedProfile, error: updateError } = await adminClient
    .from('perfiles_usuario')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedProfile);
}
