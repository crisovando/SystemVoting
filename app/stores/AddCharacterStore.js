import alt from '../alt';
import AddCharacterActions from '../actions/AddCharacterActions';

class AddCharacterStore {
  constructor() {
    this.bindActions(AddCharacterActions);
    this.name = '';
    this.gender = '';
    this.helpblock = '';
    this.nameValidationState = '';
    this.genderValidationState = '';
  }

  onCharacterSuccess(successMessage) {
    this.nameValidationState = 'has-success';
    this.helpblock = successMessage
  }

  onCharacterFail(errorMessage) {
    this.nameValidationState = 'has-error';
    this.helpblock = successMessage
  }

  onUpdateName(event) {
    this.name = event.target.value;
    this.nameValidationState = '';
    this.helpBlock = '';
  }

  onUpdateGender(event) {
    this.gender = event.target.value;
    this.genderValidationState = '';
  }

  onInvalidName(){
    this.nameValidationState = 'has-error';
    this.helpBlock = 'Por favor ingrese un nombre'
  }

  onInvalidGender() {
    this.genderValidationState = 'has-error';
  }
}

export default alt.createStore(AddCharacterStore);
