import Backdrop from './components/Backdrop';
import { findGame } from './games/registry';
import { CATEGORIES, type CategoryId } from './games/types';
import { useRoute } from './lib/router';
import AgeGate from './screens/AgeGate';
import GameDetail from './screens/GameDetail';
import Home from './screens/Home';
import Library from './screens/Library';
import Play from './screens/Play';
import Players from './screens/Players';
import Settings from './screens/Settings';
import { useApp } from './state/AppState';

function Screen() {
  const { segments, query } = useRoute();
  const [first, second] = segments;

  switch (first) {
    case 'games': {
      const game = findGame(second);
      if (game) return <GameDetail game={game} />;
      const cat = query.get('cat');
      return <Library category={CATEGORIES.some((c) => c.id === cat) ? (cat as CategoryId) : null} />;
    }
    case 'play': {
      const game = findGame(second);
      return game ? <Play key={game.id} game={game} /> : <Home />;
    }
    case 'players':
      return <Players next={query.get('next')} />;
    case 'settings':
      return <Settings />;
    default:
      return <Home />;
  }
}

export default function App() {
  const { ageConfirmed, confirmAge } = useApp();
  return (
    <>
      <Backdrop />
      {ageConfirmed ? <Screen /> : <AgeGate onConfirm={confirmAge} />}
    </>
  );
}
