import 'babel-polyfill';

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';
import { Runner } from '../game';
import NNModel from '../ai/models/nn/NNModel';

let runner = null;

function setup() {
  // Initialize the game Runner.
  runner = new Runner('.game', {
    T_REX_COUNT: 1,
    onReset: handleReset,
    onCrash: handleCrash,
    onRunning: handleRunning
  });
  // Set runner as a global variable if you need runtime debugging.
  window.runner = runner;
  // Initialize everything in the game and start the game.
  runner.init();
}

let firstTime = true;
function handleReset({ tRexes }) {
  if (firstTime) {
    firstTime = false;
    tRexes.forEach(tRex => {
      tRex.model = new NNModel();
      tRex.model.init();
      tRex.training = {
        inputs: [],
        labels: []
      };
    });
  } else {
    // Train the model before restarting.
    console.info('Training');
    tRexes.forEach(tRex => {
      console.log(tRex.training);
      tRex.model.fit(tRex.training.inputs, tRex.training.labels);
    });
  }
}

function handleRunning({ tRex, state }) {
  return new Promise((resolve) => {
    if (!tRex.jumping) {
      let action = 0;
      const prediction = tRex.model.predictSingle(convertStateToVector(state));
      prediction.data().then((result) => {
        tRex.lastJumpingState = state;
        if ((result[1] > result[0]) && (result[1] > result[2])) {
          // jump
          action = 1;
        } else if ((result[2] > result[0]) && (result[2] > result[1])) {
          action = -1
        }
        resolve(action);
      });
    } else {
      resolve(0);
    }
  });
}

function handleCrash({ tRex }) {
  let label = null;
  const input = convertStateToVector(tRex.lastJumpingState);
  // PTERODACTYL should ducking
  if (input[3] >= 1) {
    label = [0, 0, 1]
    // prevent fall down collision
  } else if (tRex.jumping && input[0] > 1) {
    label = [0, 0, 1];
  } else {
    label = [0, 1, 0];
  }

  tRex.training.inputs.push(input);
  tRex.training.labels.push(label);
}

function convertStateToVector(state) {
  if (state) {
    return [
      (state.obstacleX / CANVAS_WIDTH) * 5,
      (state.obstacleWidth / CANVAS_WIDTH) * 5,
      state.speed / 5,
      state.obstacleY === 50 ? 5 : 0,
    ];
  }
  return [0, 0, 0, 0];
}

document.addEventListener('DOMContentLoaded', setup);
