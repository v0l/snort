const SoundCloudEmbed =  ({link}:  {link: string}) => {

    return(
        <>
        <iframe
            width="100%"
            height="166"
            scrolling="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${link}`}>
            </iframe>
        </>
    )
}

export default SoundCloudEmbed;
