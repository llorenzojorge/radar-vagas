/**
 * Radar de Vagas: configuração.
 *
 * Termos de busca usam correspondência por palavra inteira, sem acento e sem
 * diferenciar maiúsculas. Um "*" no final transforma o termo em prefixo
 * (ex.: "desenvolv*" casa com "desenvolvedor" e "desenvolvedora").
 *
 * @type {import("./src/core/types.mjs").RadarConfig}
 */
export default {
  timezone: "America/Sao_Paulo",

  /** Exibe vagas internacionais. Pode ser alterado em tempo de execução pelo bot. */
  includeInternational: false,

  /** Ignora vagas publicadas há mais de N dias. */
  maxAgeDays: 7,

  /** Limite de vagas por notificação; o excedente segue na execução seguinte. */
  maxJobsPerRun: 25,

  /** Senioridades aceitas (buscadas no título). */
  levels: [
    "junior", "jr", "estagio", "estagiario", "estagiaria", "trainee",
    "entry level", "intern", "internship", "graduate", "aprendiz",
  ],

  /** Senioridades rejeitadas quando nenhuma das aceitas aparece no título. */
  excludedLevels: [
    "senior", "sr", "pleno", "pl", "mid", "especialista", "lead", "staff",
    "principal", "coordenador*", "gerente", "head", "manager", "arquitet*",
  ],

  /** Aceita vagas sem senioridade explícita no título. */
  includeWithoutLevel: true,

  /** Termos que identificam uma vaga de tecnologia/desenvolvimento. */
  roles: [
    "desenvolv*", "developer*", "dev", "programad*", "programmer", "engineer*",
    "engenheir* de software", "software", "front*", "back*", "full stack",
    "fullstack", "full-stack", "web", "mobile", "android", "ios", "rpa",
    "qa", "dados", "data", "sistemas", "ti", "tecnologia",
  ],

  /** Opcional: exige ao menos uma tecnologia no título ou na descrição. */
  stack: [],

  /** Marcam uma vaga de fonte nacional como internacional. */
  internationalMarkers: [
    "usd", "us$", "dolar*", "dollar*", "internacional", "exterior",
    "ingles fluente", "ingles avancado", "fluent english", "english", "ingles",
  ],

  /** Regiões aceitas em vagas internacionais (vaga sem região é aceita). */
  acceptedInternationalLocations: [
    "worldwide", "anywhere", "brazil", "brasil", "latam", "latin america",
    "south america", "americas", "global",
  ],

  sources: {
    gupy: {
      enabled: true,
      // Cada termo retorna as 12 vagas remotas mais recentes do portal.
      terms: [
        "desenvolvedor", "desenvolvedora", "developer", "programador",
        "estágio", "estagiário", "trainee", "front-end", "back-end", "full stack",
        "desenvolvedor junior", "developer junior", "analista de sistemas junior",
        "full stack junior", "qa junior", "estágio programação", "estágio ti",
        "estágio software", "estágio dados",
      ],
    },
    github: {
      enabled: true,
      repos: [
        "backend-br/vagas", "frontendbr/vagas", "react-brasil/vagas",
        "qa-brasil/vagas", "androiddevbr/vagas", "phpdevbr/vagas",
      ],
    },
    linkedinAlerts: { enabled: true, mailbox: "INBOX" },
    remotive: { enabled: true },
    remoteok: { enabled: true },
    weworkremotely: { enabled: true },
  },

  /** Resumo diário com links de busca de publicações de recrutadores no LinkedIn. */
  recruiterPosts: {
    enabled: true,
    fromHour: 9,
    queries: [
      "contratando desenvolvedor júnior remoto",
      "vaga estágio desenvolvimento remoto",
      '"#vagajunior" remoto',
      "tech recruiter vaga júnior home office",
    ],
  },
};
