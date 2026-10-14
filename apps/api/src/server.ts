import { app } from './app';

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`Donkey Play API server listening on http://localhost:${PORT}`);
});

export default server;
