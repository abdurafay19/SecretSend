import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import { Analytics } from '@vercel/analytics/react';

import CreateSecret from "./pages/CreateSecret";
import ViewSecret from "./pages/ViewSecret";
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

            </Routes>
            <Analytics />
        </BrowserRouter>
    );
}

export default App;