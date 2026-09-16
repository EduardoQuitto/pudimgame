// Bootstrap: importa CSS, cria o Game e expõe para debug.
import './style.css';
import { Game } from './core/Game.js';

const game = new Game();
window.__pudim = game;
game.init();
