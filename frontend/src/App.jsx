import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import CreateSecret from "./pages/CreateSecret";
import ViewSecret from "./pages/ViewSecret";
import RedeemCode from "./pages/RedeemCode";
import "./App.css";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/"
                    element={<CreateSecret />}
                />

                <Route
                    path="/s/:id"
                    element={<ViewSecret />}
                />

                <Route
                    path="/code"
                    element={<RedeemCode />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;