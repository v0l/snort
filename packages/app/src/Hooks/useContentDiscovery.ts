import { DVMJobRequest, NostrLink, RequestBuilder } from "@snort/system";
import { useEffect, useMemo, useState } from "react";
import useEventPublisher from "./useEventPublisher";
import { useRequestBuilder } from "@snort/system-react";

export default function useContentDiscovery(serviceProvider: string, relays?: Array<string>) {
    const { publisher, system } = useEventPublisher();
    const [posts, setPosts] = useState<Array<NostrLink>>();
    const [error, setError] = useState<Error>();

    const req = useMemo(() => {
        const job = new DVMJobRequest(5300)
            .setServiceProvider(serviceProvider);
        relays?.forEach(r => job.addRelay(r));
        return job;
    }, []);

    useEffect(() => {
        if (!system || !publisher) {
            return;
        }

        req.on("result", e => {
            try {
                const tags = JSON.parse(e.content) as Array<Array<string>>;
                const links = NostrLink.fromTags(tags);
                setPosts(links);
            } catch (x) {
                console.error("Failed to parse content discovery response", x);
            }
        });
        req.on("error", e => {
            setError(new Error(e));
        });
        req.request(publisher.signer, system, relays);
        return () => {
            req.abort(system);
        }
    }, [req, publisher, system]);

    const sub = useMemo(() => {
        const rb = new RequestBuilder(`content-discovery:${req.id}`);
        if (posts) {
            const f = rb.withFilter();
            posts.forEach(p => f.link(p));
        }
        return rb;
    }, [req, posts]);

    const data = useRequestBuilder(sub);
    return {
        req, data, posts, error
    };
}