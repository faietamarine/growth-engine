/**
 * Modelli a catalogo per marchio (da ordinare). Non contiene foto né prezzi:
 * quelli li aggiunge il team dal gestionale. Il caricamento è idempotente
 * (marca + modello già presenti non vengono toccati).
 */
export type ModelloCatalogo = { marca: string; modello: string; categoria: "GOMMONE" | "OPEN" | "CABINATO" | "MOTO_ACQUA" | "FUORIBORDO"; lunghezza?: number };

const m = (marca: string, categoria: ModelloCatalogo["categoria"], nomi: string[]): ModelloCatalogo[] =>
  nomi.map((modello) => ({ marca, modello, categoria }));

export const MODELLI_CATALOGO: ModelloCatalogo[] = [
  // Jeanneau: solo Cap Camarat (CC = console centrale, WA = walk around) e Merry Fisher
  ...m("jeanneau", "OPEN", ["Cap Camarat 5.5 CC", "Cap Camarat 6.0 CC", "Cap Camarat 6.5 CC", "Cap Camarat 7.5 CC", "Cap Camarat 9.0 CC", "Cap Camarat 10.5 CC"]),
  ...m("jeanneau", "CABINATO", [
    "Cap Camarat 5.5 WA", "Cap Camarat 6.5 WA", "Cap Camarat 7.5 WA", "Cap Camarat 9.0 WA", "Cap Camarat 10.5 WA", "Cap Camarat 12.5 WA",
    "Merry Fisher 605", "Merry Fisher 695", "Merry Fisher 795", "Merry Fisher 895", "Merry Fisher 1095 Coupé", "Merry Fisher 1095 Fly",
    "Merry Fisher 1295 Coupé", "Merry Fisher 1295 Fly", "Merry Fisher Sport 695", "Merry Fisher Sport 795", "Merry Fisher Sport 895",
  ]),
  // Invictus: solo serie S con fuoribordo, fino al GT370S
  ...m("invictus", "OPEN", ["TT280S", "GT280S", "GT320S", "GT370S"]),
  // Capoforte
  ...m("capoforte", "OPEN", ["FX190", "FX200", "FX240", "FX270", "CX240", "CX250i", "CX270", "CX280i", "SX200", "SX280i", "HX200"]),
  // Joker Boat (gommoni)
  ...m("joker-boat", "GOMMONE", [
    "Clubman 21", "Clubman 22 Plus", "Clubman 24", "Clubman 26", "Clubman 28", "Clubman 30", "Clubman 32", "Clubman 35",
    "Coaster 520", "Coaster 580 Plus", "Coaster 650 Plus", "Barracuda 580", "Barracuda 650",
  ]),
  // Italmar (cabin)
  ...[["Cabin 28", 8.2], ["Cabin 24", 7.3], ["Cabin 23", 6.9], ["Cabin 22", 6.5], ["Cabin 18", 5.5]].map(([modello, lunghezza]) => ({ marca: "italmar", modello: modello as string, categoria: "CABINATO" as const, lunghezza: lunghezza as number })),
  // Capelli: barche
  ...m("capelli", "CABINATO", ["Cap 33 WA", "Cap 28 WA", "Cap 25 WA", "Cap 21.5 WA"]),
  ...m("capelli", "OPEN", [
    "Alma 21", "Alma 27", "Cap 25 Open", "Cap 21 Open", "Capelli 20.5", "Cap 19 Open", "Cap 520 Open", "Cristal 450 Sun", "Cristal 400",
    "Dino 26", "Dino 23", "Osia 315", "Freedom 20", "Freedom 18", "Freedom 16",
  ]),
  // Capelli: gommoni
  ...m("capelli", "GOMMONE", [
    "Tempest 50", "Tempest 44", "Tempest 42", "Tempest 40", "Tempest 38",
    "Tempest 1000 WA", "Tempest 1000 Open", "Tempest 900 Chase", "Tempest 900 Luxe", "Tempest 900 Open", "Tempest 900 WA", "Tempest 850 WA", "Tempest 850 Open",
    "Tempest 800 Open", "Tempest 800", "Tempest 775", "Tempest 750 Luxe", "Tempest 750 Sport", "Tempest 700 Luxe", "Tempest 700 Open", "Tempest 650", "Tempest 600",
    "Tempest 570", "Tempest 530", "Tempest 480", "Tempest 430", "BR 65",
    "Tempest 460 Yacht Tender", "Tempest 410 Yacht Tender", "Tempest 360 Yacht Tender", "Tempest 340 Yacht Tender",
    "Tempest 360 Tender", "Tempest 340 LE", "Tempest 310 Tender", "Tempest 275 Tender", "Tempest 250 Tender", "Tempest 220 Tender",
    "Tempest 625 Easy", "Tempest 570 Easy", "Tempest 505 Easy", "Tempest 425 Easy",
    "Tempest 750 Fishing", "Tempest 700 Fishing", "Tempest 625 Fishing", "Apnea 70", "Apnea 51",
    "Tempest 900 Work", "Tempest 750 Work", "Tempest 700 Work", "Tempest 625 Work", "Tempest 560 Work", "Tempest 500 Work", "Tempest 430 Work",
  ]),
  // Yamaha: solo marine
  ...m("yamaha", "FUORIBORDO", [
    "F2.5", "F4", "F5", "F6", "F8", "F9.9", "F15", "F20", "F25", "F30", "F40", "F50", "F60", "F70", "F80", "F100", "F115", "F130", "F150", "F175", "F200", "F225", "F250", "F300", "F350", "F425",
    "V MAX SHO 200", "V MAX SHO 250",
  ]),
  ...m("yamaha", "MOTO_ACQUA", [
    "WaveBlaster", "JetBlaster PRO", "JetBlaster DLX", "CrossWave", "FX Cruiser SVHO", "FX Cruiser HO", "FX HO", "VX Limited HO", "VX DeLuxe", "VX-EU", "GP SVHO", "SuperJet",
  ]),
];
