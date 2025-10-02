import React from "react";
import { Provider } from "react-redux";
import { useSelector } from "react-redux";
import { store, RootState } from "./store";
import { HomePage } from "./pages/HomePage/HomePage";
import { PlayPageMobile } from "./pages/PlayPageMobile";
import { HomePageMobile } from "./pages/HomePage/HomePageMobile";

const AppContent: React.FC = () => {
  const currentPage = useSelector((state: RootState) => state.game.currentPage);

  switch (currentPage) {
    case "play":
      return <PlayPageMobile />;
    default:
      return <HomePageMobile />;
  }
};

function App() {
  return (
    <Provider store={store}>
      <div className="font-mono">
        <AppContent />
      </div>
    </Provider>
  );
}

export default App;
