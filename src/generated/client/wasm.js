
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.18.0
 * Query Engine version: 4c784e32044a8a016d99474bd02a3b6123742169
 */
Prisma.prismaVersion = {
  client: "5.18.0",
  engine: "4c784e32044a8a016d99474bd02a3b6123742169"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ClinicaScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  slug: 'slug',
  nome: 'nome',
  nicho: 'nicho',
  configBranding: 'configBranding',
  razaoSocial: 'razaoSocial',
  cnpj: 'cnpj',
  endereco: 'endereco',
  adminPhone: 'adminPhone',
  botActive: 'botActive',
  onboardingCompleted: 'onboardingCompleted',
  multiProfissional: 'multiProfissional',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UsuarioScalarFieldEnum = {
  id: 'id',
  email: 'email',
  senhaHash: 'senhaHash',
  role: 'role',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PacienteScalarFieldEnum = {
  id: 'id',
  nome: 'nome',
  telefone: 'telefone',
  convenio: 'convenio',
  tipoAtendimento: 'tipoAtendimento',
  totalGasto: 'totalGasto',
  ultimaVisita: 'ultimaVisita',
  contagemVisitas: 'contagemVisitas',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfissionalScalarFieldEnum = {
  id: 'id',
  nome: 'nome',
  especialidade: 'especialidade',
  registroProfissional: 'registroProfissional',
  bio: 'bio',
  fotoUrl: 'fotoUrl',
  color: 'color',
  horariosJson: 'horariosJson',
  ativo: 'ativo',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProfessionalScheduleScalarFieldEnum = {
  id: 'id',
  profissionalId: 'profissionalId',
  diaSemana: 'diaSemana',
  horaInicio: 'horaInicio',
  horaFim: 'horaFim',
  ativo: 'ativo'
};

exports.Prisma.ConvenioEmpresaScalarFieldEnum = {
  id: 'id',
  nomeConvenio: 'nomeConvenio',
  ativo: 'ativo',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NichoConfigScalarFieldEnum = {
  id: 'id',
  nomeNicho: 'nomeNicho',
  labelCliente: 'labelCliente',
  labelServico: 'labelServico',
  labelProfissional: 'labelProfissional',
  servicosPadraoJson: 'servicosPadraoJson'
};

exports.Prisma.AgendamentoScalarFieldEnum = {
  id: 'id',
  pacienteId: 'pacienteId',
  profissionalId: 'profissionalId',
  dataHora: 'dataHora',
  fimDataHora: 'fimDataHora',
  durationMinutes: 'durationMinutes',
  status: 'status',
  eventoId: 'eventoId',
  convenio: 'convenio',
  tipoAtendimento: 'tipoAtendimento',
  tenantId: 'tenantId',
  servicoId: 'servicoId',
  observacoes: 'observacoes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransacaoFinanceiraScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  tipo: 'tipo',
  status: 'status',
  valor: 'valor',
  descricao: 'descricao',
  categoria: 'categoria',
  agendamentoId: 'agendamentoId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiLogScalarFieldEnum = {
  id: 'id',
  mensagem: 'mensagem',
  createdAt: 'createdAt'
};

exports.Prisma.InviteTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  email: 'email',
  role: 'role',
  tenantId: 'tenantId',
  used: 'used',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.AssinaturaScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubId: 'stripeSubId',
  plano: 'plano',
  status: 'status',
  updatedAt: 'updatedAt'
};

exports.Prisma.ServicoScalarFieldEnum = {
  id: 'id',
  nome: 'nome',
  descricao: 'descricao',
  duracaoMinutos: 'duracaoMinutos',
  bufferTimeMinutes: 'bufferTimeMinutes',
  preco: 'preco',
  color: 'color',
  nicho: 'nicho',
  ativo: 'ativo',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComboUpsellScalarFieldEnum = {
  idItem: 'idItem',
  tenantId: 'tenantId',
  servicoGatilhoId: 'servicoGatilhoId',
  servicoOferecidoId: 'servicoOferecidoId',
  descricaoOferta: 'descricaoOferta',
  desconto: 'desconto',
  ativo: 'ativo',
  createdAt: 'createdAt'
};

exports.Prisma.CampanhaAvisoScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  titulo: 'titulo',
  mensagem: 'mensagem',
  segmentoFiltrosJson: 'segmentoFiltrosJson',
  dataEnvio: 'dataEnvio',
  status: 'status',
  totalEnviado: 'totalEnviado',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificacaoScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  titulo: 'titulo',
  mensagem: 'mensagem',
  lida: 'lida',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Clinica: 'Clinica',
  Usuario: 'Usuario',
  Paciente: 'Paciente',
  Profissional: 'Profissional',
  ProfessionalSchedule: 'ProfessionalSchedule',
  ConvenioEmpresa: 'ConvenioEmpresa',
  NichoConfig: 'NichoConfig',
  Agendamento: 'Agendamento',
  TransacaoFinanceira: 'TransacaoFinanceira',
  AiLog: 'AiLog',
  InviteToken: 'InviteToken',
  Assinatura: 'Assinatura',
  Servico: 'Servico',
  ComboUpsell: 'ComboUpsell',
  CampanhaAviso: 'CampanhaAviso',
  Notificacao: 'Notificacao'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
