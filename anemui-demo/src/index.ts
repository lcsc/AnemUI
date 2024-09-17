import { AppDemo } from "./App";
export const app = AppDemo.getInstance();

app.configure()
    .then((res) => { app.render() })
    .catch((res) => { console.error("error loading data...", res) });

