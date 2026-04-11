export const playSound = (soundFile: string) => {
  try {
    const audio = new Audio(soundFile);
    audio.volume = 0.3;
    audio.play().catch(e => console.error("La riproduzione automatica dell'audio è fallita", e));
  } catch (e) {
    console.error("Impossibile riprodurre il suono", e);
  }
};