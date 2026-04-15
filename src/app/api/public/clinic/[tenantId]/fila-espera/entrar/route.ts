import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/clinic/[tenantId]/fila-espera/entrar
 * Rota pública — chamada pelo link de agendamento.
 * Resolve ou cria paciente pelo nome+telefone, depois entra na fila.
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await props.params;

  let body: any;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const { clienteNome, clienteTelefone, servicoId, profissionalId, dataDesejada, horarioDesejado } = body;

  if (!clienteNome || !clienteTelefone || !servicoId || !dataDesejada) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  try {
    // Resolver ou criar paciente
    let paciente = await prisma.paciente.findFirst({
      where: { tenantId, telefone: { contains: clienteTelefone.slice(-8) } },
    });

    if (!paciente) {
      paciente = await prisma.paciente.create({
        data: {
          tenantId,
          nome: clienteNome,
          telefone: clienteTelefone,
        },
      });
    }

    // Delegar para a rota interna
    const resp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/fila-espera/entrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.N8N_API_KEY ?? '' },
      body: JSON.stringify({
        tenantId,
        pacienteId: paciente.id,
        servicoId,
        profissionalId: profissionalId ?? null,
        dataDesejada,
        horarioDesejado: horarioDesejado ?? null,
        preferencia: 'qualquer',
      }),
    });

    const data = await resp.json();
    return Response.json(data);
  } catch (err) {
    console.error('[public fila-espera/entrar]', err);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
