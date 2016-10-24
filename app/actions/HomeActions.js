import alt from '../alt';

class HomeActions {
  constructor() {
    this.generateActions(
      'getTwoCharacterSuccess',
      'getTwoCharacterFail',
      'voteFail'
    )
  }

  getTwoCharacters(winner, loser) {
    $.ajax({
      type: 'PUT',
      url: '/api/characters',
      data: { winner: winner, loser: loser}
    })
    .done(() => {
      this.actions.getTwoCharacters();
    })
    .fail((jqXhr) => {
      this.actions.voteFail(jqXhr.responseJSON.message);
    })
  }
}

export default alt.createActions(HomeActions);
