import Nip5Service from "../element/Nip5Service";

import './Verification.css'

export default function VerificationPage() {
    const services = [
        {
            name: "Snort",
            service: "https://api.snort.social/api/v1/n5sp",
            link: "https://snort.social/",
            supportLink: "https://snort.social/help",
            about: <>Our very own NIP-05 verification service, help support the development of this site and get a shiny special badge on our site!</>
        },
        {
            name: "Nostr Plebs",
            service: "https://nostrplebs.com/api/v1",
            link: "https://nostrplebs.com/",
            supportLink: "https://nostrplebs.com/manage",
            about: <>
                <p>Nostr Plebs is one of the first NIP-05 providers in the space and offers a good collection of domains at reasonable prices</p>
            </>
        }
    ];

    return (
        <div className="verification">
            <h2>Get Verified</h2>
            <p>
                NIP-05 is a DNS based verification spec which helps to validate you as a real user.
            </p>
            <p>Getting NIP-05 verified can help:</p>
            <ul>
                <li>Prevent fake accounts from immitating you</li>
                <li>Make your profile easier to find and share</li>
                <li>Fund developers and platforms providing NIP-05 verification services</li>
            </ul>

            {services.map(a => <Nip5Service key={a.name} {...a} />)}
        </div>
    )
}