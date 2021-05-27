
import GLManager from './glManager.js'

const esDifference = 0.001; //recommended value
const change = 0.001;
let spotStart = 0.99;
let spotEnd = spotStart - esDifference;


window.onload = () => {
  const manager = new GLManager()
  manager.init()

  const refresh= () => {
    cancelAnimationFrame(manager.currentAnimationRequest);
    manager.draw()
  }


  window.onkeyup = (event) => {
    let key = event.key;

    switch (key) {
      case 'p':
        if (spotStart + change <= 1 + change) {
          spotStart += change;
          spotEnd = spotStart - esDifference;
          manager.spotStart = spotStart
          manager.spotEnd = spotEnd
          refresh()
        }
        break;
      case 'i':
        if (spotStart - change >= 0) {
          spotStart -= change;
          spotEnd = spotStart - esDifference;
          manager.spotStart = spotStart
          manager.spotEnd = spotEnd
          refresh()
        }
        break;
      case 'm':
        manager.mode = "gouraud";
        refresh()
        break;
      case 'n':
        manager.mode = "flat";
        refresh()
        break;
      case 'a':
        manager.shadow = !manager.shadow;
        refresh()
        break;
      case 'b':
        manager.texture = !manager.texture;
        refresh()
        break;
      case 'c':
        manager.reflection = !manager.reflection;
        refresh()
        break;
      case 'd':
        manager.refraction = !manager.refraction;
        refresh()
        break;
    }
  };
}
