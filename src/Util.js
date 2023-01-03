
export async function openFile() {
    return new Promise((resolve, reject) => {
        let elm = document.createElement("input");
        elm.type = "file";
        elm.onchange = (e) => {
            resolve(e.target.files[0]);
        };
        elm.click();
    });
}
