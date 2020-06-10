import Scene from './Scene';

const app = new Scene();
app.render();
app.init();

const diceAmountElement = document.getElementById('roll-amount') as HTMLElement;
const sliderElement = document.getElementById('slider') as HTMLInputElement;
const incButtonElement = document.querySelector('.btn-set-inc') as HTMLElement;
const decButtonElement = document.querySelector('.btn-set-dec') as HTMLElement;
const rollButtonElement = document.querySelector('.btn-main') as HTMLElement;

const RollAmountHandler = (toInc: boolean) => {
  const MaxValue = 5;
  const minValue = 1;
  const targetElementValue = Number(diceAmountElement.textContent);
  const newValue = toInc ? targetElementValue + 1 : targetElementValue - 1;
  if (newValue >= minValue && newValue <= MaxValue) {
    diceAmountElement.textContent = newValue.toString();
  }
};

sliderElement.onclick = () => {
  const selectElements = document.querySelectorAll('span.select');
  selectElements.forEach((el) => el.classList.toggle('active'));
};

incButtonElement.onclick = () => RollAmountHandler(true);
decButtonElement.onclick = () => RollAmountHandler(false);

rollButtonElement.onclick = () => {
  const dieType = sliderElement.checked ? app.customModels.d20 : app.customModels.d6;
  const amountToRoll = Number(diceAmountElement.textContent);
  app.roll(amountToRoll, dieType);
};

window.addEventListener('resize', () => app.resize());
