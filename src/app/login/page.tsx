'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    const supabase = createClient();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 8000)
      );

      const response = await Promise.race([
        supabase.auth.signInWithPassword({ email: data.email, password: data.password }),
        timeoutPromise,
      ]);

      const { error } = response;

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('Correo o contraseña incorrectos.');
        } else {
          setAuthError(error.message);
        }
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'TIMEOUT') {
        setAuthError('La conexión está tardando demasiado. Asegúrate de tener buena señal o recarga la página.');
      } else {
        setAuthError('Error inesperado. Intenta recargar la página.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#181B21] rounded-xl shadow-2xl p-8 border border-white/5">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-gray-400">Ingresa a tu cuenta para continuar</p>
        </div>

        {authError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Correo Electrónico</label>
            <input
              type="email"
              {...register('email')}
              className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="tu@correo.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
