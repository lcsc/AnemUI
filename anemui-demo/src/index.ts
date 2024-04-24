import { AppETO } from "./App";
export const app = AppETO.getInstance();

app.configure()
    .then((res) => { app.render() })
    .catch((res) => { console.error("error loading data...", res) });

