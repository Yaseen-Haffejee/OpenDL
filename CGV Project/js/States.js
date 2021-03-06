import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

// state controller class which will be the base for all other state classes
// Enables us to transition between states 
// Updates the states and current animation
class stateController {
  constructor() {
    this.allStates = {};
    this.CurrentState = null;
  }

  addState(name, type) {
    this.allStates[name] = type;
  }

  setState(name) {
    const PreviousState = this.CurrentState;

    if (PreviousState) {
      if (PreviousState.Name == name) {
        return;
      }
      PreviousState.Exit();
    }

    const state = new this.allStates[name](this);

    this.CurrentState = state;
    state.Enter(PreviousState);
  }

  Update(timeGone, input) {
    if (this.CurrentState) {
      this.CurrentState.Update(timeGone, input);
    }
  }
};


class CharacterController extends stateController {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this.init();
  }
  // Pass in all states and add them to the list of all possible states
  init() {
    this.addState('idle', IdleState);
    this.addState('walk', WalkState);
    this.addState('run', RunState);
    this.addState('Jumping Up', JumpingState);
  }
};


class State {
  constructor(parent) {
    this.parent = parent;
  }
  // define functions to deal with entering and leaving a state smoothly
  //Update animations smoothly

  Enter() { }
  Exit() { }
  Update() { }
};

// Creating a jump state for an idle player
class JumpingState extends State {
  constructor(parent) {
    super(parent);

    this.DoneCallback = () => {
      this.Done();
    }
  }

  get Name() {
    return 'Jumping Up';
  }
  // Define a function that will take the previous state and smoothly transition into a jumping state
  // This state will only become active from the idle state so it's just a matter of playing the animation
  Enter(PreviousState) {
    const CurrentAction = this.parent._proxy.allAnimations['Jumping Up'].action;
    const mixer = CurrentAction.getMixer();
    mixer.addEventListener('finished', this.DoneCallback);

    if (PreviousState) {
      const PreviousAction = this.parent._proxy.allAnimations[PreviousState.Name].action;

      CurrentAction.reset();
      CurrentAction.setLoop(THREE.LoopOnce, 1);
      CurrentAction.clampWhenFinished = true;
      CurrentAction.crossFadeFrom(PreviousAction, 0.2, true);
      CurrentAction.play();
    } else {
      CurrentAction.play();
    }
  }
  //Always go back to the idle state when done
  Done() {
    this.clean();
    this.parent.setState('idle');
  }

  clean() {
    const action = this.parent._proxy.allAnimations['Jumping Up'].action;

    action.getMixer().removeEventListener('finished', this.cleanCallback);
  }

  Exit() {
    this.clean();
  }

  Update(_) {
  }
};


class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(PreviousState) {
    const CurrentAction = this.parent._proxy.allAnimations['walk'].action;
    if (PreviousState) {
      const PreviousAction = this.parent._proxy.allAnimations[PreviousState.Name].action;

      CurrentAction.enabled = true;
      // If the previous state was running , slowly transition to the walk state by getting the duration of run state and and duration of walk state
      // and multiplying the time spent in the previous state by the ratio.
      if (PreviousState.Name == 'run') {
        const ratio = CurrentAction.getClip().duration / PreviousAction.getClip().duration;
        CurrentAction.time = PreviousAction.time * ratio;
      }
      // if the previous state was idle, then just walk and no real transition fade is required.
      else {
        CurrentAction.time = 0.0;
        CurrentAction.setEffectiveTimeScale(1.0);
        CurrentAction.setEffectiveWeight(1.0);
      }

      CurrentAction.crossFadeFrom(PreviousAction, 0.5, true);
      CurrentAction.play();
    } else {
      CurrentAction.play();
    }
  }

  Exit() {
  }

  Update(timeGone, input) {
    if (input.keys.forward || input.keys.backward) {
      if (input.keys.shift) {
        this.parent.setState('run');
      }
      return;
    }

    this.parent.setState('idle');
  }
};


class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'run';
  }

  Enter(PreviousState) {
    const CurrentAction = this.parent._proxy.allAnimations['run'].action;
    if (PreviousState) {
      const PreviousAction = this.parent._proxy.allAnimations[PreviousState.Name].action;

      CurrentAction.enabled = true;

      if (PreviousState.Name == 'walk') {
        const ratio = CurrentAction.getClip().duration / PreviousAction.getClip().duration;
        CurrentAction.time = PreviousAction.time * ratio;
      } else {
        CurrentAction.time = 0.0;
        CurrentAction.setEffectiveTimeScale(1.0);
        CurrentAction.setEffectiveWeight(1.0);
      }

      CurrentAction.crossFadeFrom(PreviousAction, 0.5, true);
      CurrentAction.play();
    } else {
      CurrentAction.play();
    }
  }

  Exit() {
  }

  Update(timeGone, input) {
    if (input.keys.forward || input.keys.backward) {
      if (!input.keys.shift) {
        this.parent.setState('walk');
      }
      return;
    }

    this.parent.setState('idle');
  }
};


class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(PreviousState) {
    const idleAction = this.parent._proxy.allAnimations['idle'].action;
    if (PreviousState) {
      const PreviousAction = this.parent._proxy.allAnimations[PreviousState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(PreviousAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input.keys.forward || input.keys.backward) {
      this.parent.setState('walk');
    } else if (input.keys.space) {
      this.parent.setState('Jumping Up');
    }
  }
};

export { CharacterController }