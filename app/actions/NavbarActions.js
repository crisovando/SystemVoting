import alt from '../alt';
import {assign} from 'underscore';

class NavbarActions {
  constructor() {
    this.generateActions(
      'updateOnlineUsers',
      'updateAjaxAnimations',
      'updateSearchQuery',
      'getCharacterCountSuccess',
      'getCharacterCountFail',
      'findCharacterSuccess',
      'findCharacterFail'
    );
  }

  findCharacter(payLoad) {
    $.ajax({
      url: '/api/character/search',
      data: { name: payLoad.searchQuery }
    })
      .done((data) => {
        assign(payLoad, data);
        this.actions.getCharacterCountSuccess(data)
      })
      .fail((jqXhr) => {
        this.actions.getCharacterCountFail(jqXhr)
      });
  }

  getCharacterCount() {
    $.ajax({ url: '/api/character/count' })
      .done((data) => {
        this.actions.getCharacterCountSuccess(data)
      })
      .fail((jqXhr) => {
        this.actions.getCharacterCountFail(jqXhr)
      })
  }
}

export default alt.createActions(NavbarActions);
