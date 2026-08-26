export type ProductCategory = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type RepresentedBrand = {
  name: string;
  logo: string;
  featured: boolean;
};

export const siteConfig = {
  name: "RF Representa",
  territory: "Todo o estado de Mato Grosso",
  contact: {
    cta: "Falar com um consultor",
    ctaWhatsapp: "Falar com um consultor no WhatsApp",
    ariaWhatsapp: "Falar com um consultor no WhatsApp",
    heroSupport:
      "Atendimento direto com nosso time comercial, da escolha do mix ao acompanhamento de cada pedido.",
    teamHeadline: "Consultoria comercial em Mato Grosso",
    teamQuote:
      "Atendimento próximo para ajudar cada lojista a encontrar o mix certo para o seu negócio.",
    heroFactLabel: "Com nosso time",
  },
  company: {
    legalName: "RLBF Representação Comercial Ltda",
    cnpj: "31.669.335/0001-20",
    address:
      "Rua Professora Delphina Alves da Costa, 09 - Quadra 04 sala B - Jardim Petrópolis, Cuiabá - MT, 78070-060",
  },
  whatsappNumber: "5566999687575",
  whatsappDisplay: "(66) 99968-7575",
  whatsappMessage:
    "Olá! Vim pelo site da RF Representa e gostaria de conhecer o portfólio Altenburg para minha loja.",
  navigation: [
    { label: "Catálogo", href: "/catalogo" },
    { label: "Portfólio", href: "#portfolio" },
    { label: "Altenburg", href: "#altenburg" },
    { label: "Atendimento", href: "#atendimento" },
    { label: "Dúvidas", href: "#duvidas" },
  ],
  categories: [
    {
      id: "cama",
      name: "Cama",
      description: "Jogos de cama e lençóis para diferentes estilos e ocasiões.",
      image: "/images/altenburg/colcha-online.jpg",
      imageAlt: "Cama produzida com jogo de cama Altenburg em tons claros",
    },
    {
      id: "colchas-edredons",
      name: "Colchas e edredons",
      description: "Camadas de aconchego, acabamento e presença para a loja.",
      image: "/images/altenburg/edredom-moment.jpg",
      imageAlt: "Edredom Altenburg em quarto contemporâneo",
    },
    {
      id: "travesseiros",
      name: "Travesseiros",
      description: "Opções pensadas para diferentes perfis de conforto e sono.",
      image: "/images/altenburg/hero-edredom.jpg",
      imageAlt: "Composição de cama com travesseiros Altenburg",
    },
    {
      id: "banho",
      name: "Banho",
      description: "Toalhas macias, absorventes e coordenadas em diversas cores.",
      image: "/images/altenburg/banho-gyo.jpg",
      imageAlt: "Toalhas Altenburg dobradas em diferentes cores",
    },
  ] satisfies ProductCategory[],
  brands: [
    {
      name: "Altenburg",
      logo: "/images/altenburg/logo-altenburg.svg",
      featured: true,
    },
  ] satisfies RepresentedBrand[],
  stats: [
    {
      value: 100,
      suffix: "+",
      label: "Anos de tradição Altenburg",
    },
    {
      value: 4,
      suffix: "",
      label: "Categorias principais no portfólio",
    },
    {
      value: 27,
      suffix: "",
      label: "Municípios em Mato Grosso",
    },
  ],
} as const;

export function buildWhatsAppUrl(message: string = siteConfig.whatsappMessage) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function buildMapsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.company.address)}`;
}
