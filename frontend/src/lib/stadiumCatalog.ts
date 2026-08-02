/**
 * Catálogo curado de estadios europeos (y unos clásicos) para el mapa on-read.
 * Se empareja por alias de equipo local — sin API externa.
 */
export type StadiumDef = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Nombres/apodos del equipo local (minúsculas, sin acentos preferible). */
  aliases: string[];
};

export const STADIUM_CATALOG: readonly StadiumDef[] = [
  // España
  { id: 'benito-villamarin', name: 'Benito Villamarín', city: 'Sevilla', country: 'ES', lat: 37.3565, lng: -5.9816, aliases: ['betis', 'real betis', 'real betis balompie'] },
  { id: 'ramon-sanchez-pizjuan', name: 'Ramón Sánchez-Pizjuán', city: 'Sevilla', country: 'ES', lat: 37.3841, lng: -5.9706, aliases: ['sevilla', 'sevilla fc'] },
  { id: 'camp-nou', name: 'Spotify Camp Nou', city: 'Barcelona', country: 'ES', lat: 41.3809, lng: 2.1228, aliases: ['barcelona', 'barca', 'barsa', 'fc barcelona'] },
  { id: 'santiago-bernabeu', name: 'Santiago Bernabéu', city: 'Madrid', country: 'ES', lat: 40.4531, lng: -3.6883, aliases: ['real madrid'] },
  { id: 'metropolitano', name: 'Cívitas Metropolitano', city: 'Madrid', country: 'ES', lat: 40.4362, lng: -3.5995, aliases: ['atletico', 'atletico de madrid', 'atleti', 'atletico madrid'] },
  { id: 'san-mames', name: 'San Mamés', city: 'Bilbao', country: 'ES', lat: 43.2642, lng: -2.9494, aliases: ['athletic', 'athletic club', 'athletic bilbao', 'bilbao'] },
  { id: 'mestalla', name: 'Mestalla', city: 'Valencia', country: 'ES', lat: 39.4747, lng: -0.3584, aliases: ['valencia', 'valencia cf'] },
  { id: 'rcde-stadium', name: 'RCDE Stadium', city: 'Cornellà', country: 'ES', lat: 41.3479, lng: 2.0757, aliases: ['espanyol', 'rcd espanyol'] },
  { id: 'anoeta', name: 'Reale Arena', city: 'San Sebastián', country: 'ES', lat: 43.3014, lng: -1.9735, aliases: ['real sociedad', 'sociedad'] },
  { id: 'balaidos', name: 'Abanca Balaídos', city: 'Vigo', country: 'ES', lat: 42.2116, lng: -8.7397, aliases: ['celta', 'celta de vigo', 'rc celta'] },
  { id: 'la-rosaleda', name: 'La Rosaleda', city: 'Málaga', country: 'ES', lat: 36.7341, lng: -4.4265, aliases: ['malaga', 'malaga cf'] },
  { id: 'el-sadar', name: 'El Sadar', city: 'Pamplona', country: 'ES', lat: 42.7967, lng: -1.6369, aliases: ['osasuna', 'ca osasuna'] },
  { id: 'gran-canaria', name: 'Estadio Gran Canaria', city: 'Las Palmas', country: 'ES', lat: 28.1003, lng: -15.4567, aliases: ['las palmas', 'ud las palmas'] },
  { id: 'cartuja', name: 'La Cartuja', city: 'Sevilla', country: 'ES', lat: 37.4172, lng: -6.0056, aliases: ['seleccion espanola', 'espana', 'spain'] },
  // Inglaterra
  { id: 'old-trafford', name: 'Old Trafford', city: 'Manchester', country: 'GB', lat: 53.4631, lng: -2.2913, aliases: ['manchester united', 'man united', 'man utd'] },
  { id: 'etihad', name: 'Etihad Stadium', city: 'Manchester', country: 'GB', lat: 53.4831, lng: -2.2004, aliases: ['manchester city', 'man city'] },
  { id: 'anfield', name: 'Anfield', city: 'Liverpool', country: 'GB', lat: 53.4308, lng: -2.9608, aliases: ['liverpool', 'liverpool fc'] },
  { id: 'emirates', name: 'Emirates Stadium', city: 'London', country: 'GB', lat: 51.5549, lng: -0.1084, aliases: ['arsenal', 'arsenal fc'] },
  { id: 'stamford-bridge', name: 'Stamford Bridge', city: 'London', country: 'GB', lat: 51.4817, lng: -0.1910, aliases: ['chelsea', 'chelsea fc'] },
  { id: 'tottenham-hotspur', name: 'Tottenham Hotspur Stadium', city: 'London', country: 'GB', lat: 51.6042, lng: -0.0662, aliases: ['tottenham', 'spurs', 'tottenham hotspur'] },
  // Italia
  { id: 'san-siro', name: 'San Siro', city: 'Milán', country: 'IT', lat: 45.4781, lng: 9.1240, aliases: ['milan', 'ac milan', 'inter', 'inter milan', 'internazionale'] },
  { id: 'olimpico-roma', name: 'Stadio Olimpico', city: 'Roma', country: 'IT', lat: 41.9341, lng: 12.4547, aliases: ['roma', 'as roma', 'lazio', 'ss lazio'] },
  { id: 'juventus', name: 'Allianz Stadium', city: 'Turín', country: 'IT', lat: 45.1096, lng: 7.6412, aliases: ['juventus', 'juve'] },
  // Alemania
  { id: 'allianz-arena', name: 'Allianz Arena', city: 'Múnich', country: 'DE', lat: 48.2188, lng: 11.6247, aliases: ['bayern', 'bayern munich', 'bayern munchen', 'fc bayern'] },
  { id: 'signal-iduna', name: 'Signal Iduna Park', city: 'Dortmund', country: 'DE', lat: 51.4926, lng: 7.4519, aliases: ['dortmund', 'borussia dortmund', 'bvb'] },
  // Francia
  { id: 'parc-des-princes', name: 'Parc des Princes', city: 'París', country: 'FR', lat: 48.8414, lng: 2.2530, aliases: ['psg', 'paris saint-germain', 'paris sg'] },
  { id: 'velodrome', name: 'Orange Vélodrome', city: 'Marsella', country: 'FR', lat: 43.2698, lng: 5.3959, aliases: ['marsella', 'marseille', 'olympique de marseille', 'om'] },
  // Portugal
  { id: 'da-luz', name: 'Estádio da Luz', city: 'Lisboa', country: 'PT', lat: 38.7527, lng: -9.1847, aliases: ['benfica', 'sl benfica'] },
  { id: 'dragao', name: 'Estádio do Dragão', city: 'Oporto', country: 'PT', lat: 41.1618, lng: -8.5839, aliases: ['porto', 'fc porto'] },
  // Otros
  { id: 'amsterdam-arena', name: 'Johan Cruyff Arena', city: 'Ámsterdam', country: 'NL', lat: 52.3142, lng: 4.9419, aliases: ['ajax', 'ajax amsterdam'] },
  { id: 'stade-de-france', name: 'Stade de France', city: 'Saint-Denis', country: 'FR', lat: 48.9245, lng: 2.3601, aliases: ['france', 'francia'] },
  { id: 'wembley', name: 'Wembley Stadium', city: 'London', country: 'GB', lat: 51.5560, lng: -0.2795, aliases: ['england', 'inglaterra'] },
] as const;
