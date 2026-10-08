import { findGame } from './games/registry';
import { CATEGORIES, type CategoryId } from './games/types';
import { useRoute } from './lib/router';
import CheersToast from './components/CheersToast';
import RoomGameRedirect from './components/RoomGameRedirect';
import AgeGate from './screens/AgeGate';
import GameDetail from './screens/GameDetail';
import Home from './screens/Home';
import Library from './screens/Library';
import OnlinePlay from './screens/OnlinePlay';
import Play from './screens/Play';
import Players from './screens/Players';
import Room from './screens/Room';
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
    case 'online': {
      const game = findGame(second);
      return game?.online ? <OnlinePlay key={game.id} game={game} /> : <Home />;
    }
    case 'players':
      return <Players next={query.get('next')} />;
    case 'settings':
      return <Settings />;
    case 'room':
      return <Room joinCode={null} />;
    case 'join':
      return <Room key={second} joinCode={second ?? null} />;
    default:
      return <Home />;
  }
}

export default function App() {
  const { ageConfirmed, confirmAge } = useApp();
  return (
    <>
      {ageConfirmed ? <Screen /> : <AgeGate onConfirm={confirmAge} />}
      <CheersToast />
      <RoomGameRedirect />
    </>
  );
}
