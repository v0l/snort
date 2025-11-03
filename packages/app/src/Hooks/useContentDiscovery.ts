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
    }, [serviceProvider, relays]);

    useEffect(() => {
        if (!system || !publisher) {
            return;
        }
        const k = `content-discovery:${serviceProvider}`;

        function setResult(content: string) {
            try {
                const tags = JSON.parse(content) as Array<Array<string>>;
                const links = NostrLink.fromTags(tags);
                setPosts(links);
            } catch (e) {
                // ignore
                setPosts([]);
            }
        }

        const cached = window.sessionStorage.getItem(k);
        if (cached) {
            setResult(cached);
            return;
        }
        setPosts(undefined);

        req.on("result", e => {
            setResult(e.content);
            window.sessionStorage.setItem(k, e.content);
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