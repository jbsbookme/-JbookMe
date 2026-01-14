import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Barbería en Lynn MA | JBS Barbershop',
  description:
    '¿Buscas barbería en Lynn, MA? En JBS Barbershop hacemos cortes modernos, fades limpios y beard trims con atención profesional. Reserva tu cita en minutos.',
};

export default function BarberiaLynnMaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Barbería en Lynn MA – JBS Barbershop
          </h1>
          <p className="text-gray-300">
            En Lynn, MA, la gente viene a JBS Barbershop por algo simple: resultados
            consistentes y un servicio profesional. Si quieres un corte bien hecho,
            un fade limpio o un beard trim que realmente marque la línea, aquí lo
            hacemos con detalle y sin apuros.
          </p>
        </header>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Cortes, fades y beard trims</h2>
          <p className="text-gray-300">
            Trabajamos cortes clásicos y modernos, taper fades, skin fades y blends
            definidos para que el resultado se vea bien desde todos los ángulos.
            También hacemos beard trims con forma, limpieza de contorno y acabado
            prolijo para que tu barba se vea cuidada sin perder tu estilo.
          </p>
          <p className="text-gray-300">
            Si vienes por primera vez, te ayudamos a escoger el estilo según tu
            tipo de cabello, la forma de tu cara y lo que usas en tu día a día.
            Si ya eres cliente, mantenemos la consistencia: mismo look, mismo
            nivel de detalle.
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Reserva tu cita en Lynn, MA</h2>
          <p className="text-gray-300">
            Puedes reservar tu cita desde el teléfono en pocos pasos. Elige el
            servicio, el profesional y el horario que te convenga.
          </p>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/reservar">Book your haircut in Lynn MA</Link>
          </Button>
        </section>

        <section className="mt-10 border-t border-gray-800 pt-8 space-y-3">
          <h2 className="text-xl font-semibold">¿Por qué JBS Barbershop?</h2>
          <ul className="list-disc pl-5 text-gray-300 space-y-2">
            <li>Fades con transiciones limpias y simétricas.</li>
            <li>Beard trims con contorno definido y acabado profesional.</li>
            <li>Atención seria: escuchamos lo que quieres y lo ejecutamos.</li>
            <li>Reserva rápida y cómoda desde la app.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
