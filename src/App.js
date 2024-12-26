import MainPage from "./pages/mainPage/mainPage";
import ContentPage from "./pages/contentPage"
import { HashRouter } from "react-router-dom";

function App() {
  return (
    <HashRouter>
    <MainPage />
    {/* <ContentPage /> */}
    </HashRouter>
  );
}

export default App;
