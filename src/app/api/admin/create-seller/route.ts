import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
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

  // Parse request body
  const body = await request.json();
  const { nombre, email, password } = body as { nombre: string; email: string; password: string };

  if (!nombre?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'nombre, email y password son obligatorios' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Create the auth user
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese correo electrónico.' }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const newUserId = authData.user.id;

  // Upsert profile in perfiles_usuario — handles the case where a DB trigger
  // already inserted a row when the auth user was created.
  const { data: sellerProfile, error: profileError } = await adminClient
    .from('perfiles_usuario')
    .upsert(
      { id: newUserId, email: email.trim(), nombre: nombre.trim(), rol: 'vendedor', activo: true },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (profileError) {
    // Rollback: delete the auth user we just created
    await adminClient.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(sellerProfile, { status: 201 });
}
