# Damas Online Multijugador

Aplicativo web completo de juego de Damas (Checkers) con multijugador en tiempo real por salas, inteligencia artificial con múltiples dificultades, modo local para dos jugadores en el mismo dispositivo, chat en vivo, ranking global persistente y efectos de sonido.

## Características Principales

- **Multijugador Online en Tiempo Real**: Crea o únete a salas personalizadas por código (ej. `SALA-1`), comparte enlaces directos mediante `?sala=CODIGO`, juega partidas en vivo o sigue partidas como espectador.
- **Modo Contra la IA (Bot)**: Practica y juega partidas individuales contra un motor de Inteligencia Artificial con 3 niveles de dificultad:
  - *Fácil*: Movimientos aleatorios y capturas básicas.
  - *Medio*: Evaluación posicional (centro, avance y coronación).
  - *Difícil*: Algoritmo Minimax con poda Alfa-Beta (Alpha-Beta pruning) y defensa de fila trasera.
- **Modo Local (2 Jugadores - Pass & Play)**: Juega cara a cara en la misma pantalla compartiendo turnos sin necesidad de conexión externa.
- **Reglamento Oficial Completo**:
  - Movimientos diagonales hacia adelante para piezas normales.
  - Saltos de captura simples y secuencias de saltos múltiples (saltos en cadena).
  - Coronación a Rey (Dama) con movimiento multidireccional hacia adelante y atrás.
  - Reglas de fin de partida: eliminación completa, bloqueo de movimientos legales, o tablas por acuerdo/empate.
- **Ranking y Estadísticas Globales Persistentes**:
  - Base de datos Postgres administrada por Netlify (`@netlify/database` y Drizzle ORM).
  - Tablas de líderes en vivo (victorias, porcentaje de éxito, rachas).
  - Historial detallado de partidas recientes y comparativa cara a cara (Head-to-Head).
- **Experiencia de Usuario Interactiva**:
  - Previsualización táctil de movimientos legales y casillas de captura.
  - Efectos de sonido (movimiento, captura, coronación de dama, turno y victoria) con opción de silencio.
  - Animación de confeti en partidas ganadas.
  - Chat en vivo integrado para las salas multijugador.

## Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Canvas Confetti.
- **Backend Serverless**: Netlify Functions (`netlify/functions/api.mts`).
- **Base de Datos**: Netlify Database (PostgreSQL administrado) con Drizzle ORM.
- **Herramientas de Construcción**: Vite 8, Drizzle Kit.

## Ejecución Local

### Prerrequisitos

- Node.js (versión 20 o superior recomendada)
- npm

### Pasos

1. Clonar el repositorio e instalar las dependencias:
   ```bash
   npm install
   ```

2. Ejecutar con Netlify CLI para emular las funciones serverless y la base de datos:
   ```bash
   npx netlify dev
   ```
   O bien, ejecutar el servidor de desarrollo independiente:
   ```bash
   npm run dev
   ```

3. Abrir `http://localhost:8889` (o el puerto indicado) en tu navegador.

## Estructura del Proyecto

```
├── db/                        # Configuración y esquemas de Netlify Database (Drizzle ORM)
│   ├── index.ts               # Cliente Drizzle adaptado para Netlify Database
│   └── schema.ts              # Esquemas de base de datos (players, matches, game_rooms)
├── netlify/
│   ├── database/migrations/   # Migraciones SQL generadas para PostgreSQL
│   └── functions/             # Funciones serverless de Netlify
│       └── api.mts            # Enrutador API REST y sincronización en tiempo real
├── src/
│   ├── components/            # Componentes React (Board, Lobby, ScoreBoard, StatsView, etc.)
│   ├── hooks/                 # Hooks de estado y red (useCheckersSocket)
│   ├── types/                 # Definiciones de tipos TypeScript
│   └── utils/                 # Lógica del juego (checkersLogic), IA (aiBot), y sonidos
├── netlify.toml               # Configuración de despliegue y funciones de Netlify
└── vite.config.ts             # Configuración de compilación Vite
```
