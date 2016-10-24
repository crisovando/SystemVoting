import alt from '../alt';
import HomeActions from '../actions/HomeActions';

class HomeStore {
  constructor() {
    this.bindActions(HomeActions);
    this.characters = [];
  }

  onGetTwoCharactersSuccess(data) {
    this.characters = data;
  }

  onGetTwoCharactersFail(errorMessage) {
    toast.error(errorMessage);
  }

  onVoteFail(errorMessage) {
    toast.error(errorMessage);
  }
}

export default alt.createStore(HomeStore);
