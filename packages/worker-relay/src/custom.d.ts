declare module "*.wasm" {
  const value: string;
  export default value;
}
declare module "*.wasm?url" {
  const value: string;
  export default value;
}