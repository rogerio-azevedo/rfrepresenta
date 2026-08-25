export type ShowcaseProduct = {
  id: string;
  name: string;
  type: string;
  image: string;
  imageAlt: string;
};

export const showcaseProducts = [
  {
    id: "travesseiro-plumi-gold",
    name: "Plumi Gold",
    type: "Travesseiro",
    image: "/images/catalogo/travesseiro-plumi-gold.jpg",
    imageAlt: "Travesseiro Altenburg Plumi Gold 50cm x 70cm",
  },
  {
    id: "travesseiro-levitare-plus",
    name: "Levitare Plus",
    type: "Travesseiro",
    image: "/images/catalogo/travesseiro-levitare-plus.jpg",
    imageAlt: "Travesseiro Levitare Plus Altenburg 50cm x 70cm",
  },
  {
    id: "jogo-cama-haus-seda-mulberry",
    name: "Haus Seda Mulberry",
    type: "Jogo de cama",
    image: "/images/catalogo/jogo-cama-haus-seda-mulberry.jpg",
    imageAlt: "Jogo de Cama Queen Altenburg Haus Seda Mulberry Bege",
  },
  {
    id: "jogo-cama-haus-algodao-egipcio",
    name: "Haus Algodão Egípcio",
    type: "Jogo de cama",
    image: "/images/catalogo/jogo-cama-haus-algodao-egipcio.jpg",
    imageAlt:
      "Jogo de Cama Queen Altenburg Haus Algodão Egípcio e Linho Supremo Branco",
  },
  {
    id: "colcha-cetim-ornament",
    name: "Cetim 300 Fios Ornament",
    type: "Colcha",
    image: "/images/catalogo/colcha-cetim-ornament.jpg",
    imageAlt:
      "Jogo de Colcha Queen Altenburg Bordados em Cetim 300 Fios Ornament",
  },
  {
    id: "colcha-haus-cetim-600-aura",
    name: "Haus Cetim 600 Aura",
    type: "Colcha",
    image: "/images/catalogo/colcha-haus-cetim-600-aura.jpg",
    imageAlt:
      "Jogo de Colcha King Altenburg Haus Cetim 600 Fios Aura Cinza",
  },
  {
    id: "toalha-scala-cinza",
    name: "Scala Cinza Steel",
    type: "Toalha",
    image: "/images/catalogo/toalha-scala-cinza.jpg",
    imageAlt: "Toalha de Banho Altenburg Scala Cinza Steel",
  },
  {
    id: "toalha-galleria-azul",
    name: "Galleria Azul",
    type: "Toalha",
    image: "/images/catalogo/toalha-galleria-azul.jpg",
    imageAlt: "Toalha de Banho Altenburg Galleria Azul",
  },
  {
    id: "almofada-serenite-verde",
    name: "Serenité Verde Bosque",
    type: "Aconchego",
    image: "/images/catalogo/almofada-serenite-verde.jpg",
    imageAlt: "Almofada Tricô 30cm x 50cm Altenburg Serenité Verde Bosque",
  },
  {
    id: "manta-haus-berlim",
    name: "Haus Berlim Bege",
    type: "Aconchego",
    image: "/images/catalogo/manta-haus-berlim.jpg",
    imageAlt: "Manta Tricô Altenburg Haus Berlim Bege",
  },
] satisfies ShowcaseProduct[];
