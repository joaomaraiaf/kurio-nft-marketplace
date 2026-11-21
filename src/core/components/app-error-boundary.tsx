import { type ErrorComponentProps, Link } from '@tanstack/react-router';
import { Button } from '@/core/components/ui/button';

export function AppErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Ocorreu um erro inesperado ao renderizar esta página.';

  return (
    <main className='min-h-dvh bg-[#140D0A] px-6 text-[#F5F1EB]'>
      <div className='mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-5'>
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-[#E89B55]'>
          Erro inesperado
        </p>
        <h1 className='text-3xl font-bold leading-tight'>Não foi possível carregar esta tela</h1>
        <p role='alert' className='text-sm text-[#CFB28C]'>
          {message}
        </p>
        <div className='flex flex-wrap gap-3 pt-2'>
          <Button type='button' onClick={() => reset()}>
            Tentar novamente
          </Button>
          <Button asChild variant='outline'>
            <Link to='/' search={{ page: 1, limit: 9, search: '', sort: 'newest' }}>
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
