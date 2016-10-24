import React from 'react';
import {Link} from 'react-router';
import HomeStore from '../stores/HomeStore';
import HomeActions from '../actions/HomeActions';
import {first, without, findWhere} from 'underscore';

class Home extends React.Component{
    constructor(props){
        super(props);
        this.state = HomeStore.getState();
        this.onChange = this.onChange.bind(this);
    }

    componentDidMount(){
        HomeStore.listen(this.onChange);
        HomeActions.getTwoCharacters();
    }

    componentWillUnmount() {
        HomeStore.unlisten(this.onChange);
    }

    onChange(state) {
        this.setState(state);
    }

    handleClick(character) {
        var winner = character.characterId;
        var loser = first(without(this.state.characters, findWhere(this.state.characters, { characterId: winner }))).characterId;
        HomeActions.vote(winner, loser);
    }

    render() {
      return (
        <div className='container'>
          <h3 className='text-center'>Click on the portrait. Select your favorite.</h3>
          <div className='row'>
            <div className='col-xs-6 col-sm-6 col-md-5 col-md-offset-1'>
              <div className='thumbnail fadeInUp animated'>
                <img onClick={this.handleClick.bind(this, characters[0])} src={'http://image.eveonline.com/Character/' + characters[0].characterId + '_512.jpg'}/>
                <div className='caption text-center'>
                  <ul className='list-inline'>
                    <li><strong>Race:</strong> {characters[0].race}</li>
                    <li><strong>Bloodline:</strong> {characters[0].bloodline}</li>
                  </ul>
                  <h4>
                    <Link to={'/characters/' + characters[0].characterId}><strong>{characters[0].name}</strong></Link>
                  </h4>
                </div>
              </div>
            </div>
            <div className='col-xs-6 col-sm-6 col-md-5'>
              <div className='thumbnail fadeInUp animated'>
                <img onClick={this.handleClick.bind(this, characters[1])} src={'http://image.eveonline.com/Character/' + characters[1].characterId + '_512.jpg'}/>
                <div className='caption text-center'>
                  <ul className='list-inline'>
                    <li><strong>Race:</strong> {characters[1].race}</li>
                    <li><strong>Bloodline:</strong> {characters[1].bloodline}</li>
                  </ul>
                  <h4>
                    <Link to={'/characters/' + characters[1].characterId}><strong>{characters[1].name}</strong></Link>
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
}

export default Home;
