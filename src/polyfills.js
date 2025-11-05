import { Buffer } from 'buffer';
import 'crypto-browserify';
import 'stream-browserify';

window.Buffer = Buffer;
window.process = {
    env: { NODE_DEBUG: undefined },
    version: '',
    nextTick: function(cb) { setTimeout(cb, 0); }
};